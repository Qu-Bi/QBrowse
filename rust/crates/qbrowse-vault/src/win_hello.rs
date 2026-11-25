use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WindowsHelloResult {
    pub available: bool,
    pub verified: bool,
    pub error: Option<String>,
}

#[cfg(windows)]
mod platform {
    use super::WindowsHelloResult;
    use anyhow::Result;
    use windows::{
        core::HSTRING,
        Foundation::IAsyncOperation,
        Security::Credentials::UI::{
            UserConsentVerifier, UserConsentVerifierAvailability, UserConsentVerificationResult,
        },
        Security::Cryptography::DataProtection::DataProtectionProvider,
        Storage::Streams::{DataReader, DataWriter, IBuffer},
        Win32::Foundation::HWND,
        Win32::System::WinRT::IUserConsentVerifierInterop,
    };

    pub async fn check_availability() -> bool {
        let Ok(op) = UserConsentVerifier::CheckAvailabilityAsync() else {
            return false;
        };
        matches!(op.get(), Ok(UserConsentVerifierAvailability::Available))
    }

    pub async fn request_verification(message: &str, hwnd: Option<isize>) -> WindowsHelloResult {
        let available = check_availability().await;
        if !available {
            return WindowsHelloResult {
                available: false,
                verified: false,
                error: Some("Windows Hello is not available on this device".to_string()),
            };
        }

        let msg = HSTRING::from(message);
        let op_res = if let Some(h) = hwnd.filter(|&v| v != 0) {
            if let Ok(interop) = windows::core::factory::<UserConsentVerifier, IUserConsentVerifierInterop>() {
                unsafe {
                    interop.RequestVerificationForWindowAsync::<_, IAsyncOperation<UserConsentVerificationResult>>(
                        HWND(h as *mut core::ffi::c_void),
                        &msg,
                    )
                }
            } else {
                UserConsentVerifier::RequestVerificationAsync(&msg)
            }
        } else {
            UserConsentVerifier::RequestVerificationAsync(&msg)
        };

        match op_res {
            Ok(op) => match op.get() {
                Ok(UserConsentVerificationResult::Verified) => WindowsHelloResult {
                    available: true,
                    verified: true,
                    error: None,
                },
                Ok(status) => WindowsHelloResult {
                    available: true,
                    verified: false,
                    error: Some(format!("Verification failed: {status:?}")),
                },
                Err(e) => WindowsHelloResult {
                    available: true,
                    verified: false,
                    error: Some(e.to_string()),
                },
            },
            Err(e) => WindowsHelloResult {
                available: true,
                verified: false,
                error: Some(e.to_string()),
            },
        }
    }

    fn bytes_to_ibuffer(data: &[u8]) -> Result<IBuffer> {
        let writer = DataWriter::new()?;
        writer.WriteBytes(data)?;
        Ok(writer.DetachBuffer()?)
    }

    fn ibuffer_to_bytes(buf: &IBuffer) -> Result<Vec<u8>> {
        let len = buf.Length()? as usize;
        let reader = DataReader::FromBuffer(buf)?;
        let mut out = vec![0u8; len];
        reader.ReadBytes(&mut out)?;
        Ok(out)
    }

    pub async fn dpapi_protect(data: &[u8]) -> Result<Vec<u8>> {
        let descriptor = HSTRING::from("LOCAL=user");
        let provider = DataProtectionProvider::CreateOverloadExplicit(&descriptor)?;
        let input = bytes_to_ibuffer(data)?;
        let protected = provider.ProtectAsync(&input)?.get()?;
        ibuffer_to_bytes(&protected)
    }

    pub async fn dpapi_unprotect(protected: &[u8]) -> Result<Vec<u8>> {
        let provider = DataProtectionProvider::new()?;
        let input = bytes_to_ibuffer(protected)?;
        let unprotected = provider.UnprotectAsync(&input)?.get()?;
        ibuffer_to_bytes(&unprotected)
    }
}

#[cfg(not(windows))]
mod platform {
    use super::WindowsHelloResult;
    use anyhow::Result;

    pub async fn check_availability() -> bool {
        false
    }

    pub async fn request_verification(_message: &str, _hwnd: Option<isize>) -> WindowsHelloResult {
        WindowsHelloResult {
            available: false,
            verified: false,
            error: Some("Windows Hello is only available on Windows".to_string()),
        }
    }

    pub async fn dpapi_protect(_data: &[u8]) -> Result<Vec<u8>> {
        Err(anyhow::anyhow!("Windows DPAPI is only available on Windows"))
    }

    pub async fn dpapi_unprotect(_protected: &[u8]) -> Result<Vec<u8>> {
        Err(anyhow::anyhow!("Windows DPAPI is only available on Windows"))
    }
}

/// Check if Windows Hello (`UserConsentVerifier`) is available.
pub async fn check_windows_hello_available() -> bool {
    platform::check_availability().await
}

/// Prompt the user for Windows Hello verification, optionally anchored to an HWND.
/// Returns `{ available: false, verified: false }` gracefully on non-Windows.
pub async fn verify_windows_hello(message: &str, hwnd: Option<isize>) -> WindowsHelloResult {
    platform::request_verification(message, hwnd).await
}

/// Protect secret bytes using Windows DPAPI `DataProtectionProvider("LOCAL=user")`.
pub async fn dpapi_protect_local_user(data: &[u8]) -> anyhow::Result<Vec<u8>> {
    platform::dpapi_protect(data).await
}

/// Unprotect secret bytes protected with Windows DPAPI.
pub async fn dpapi_unprotect_local_user(protected: &[u8]) -> anyhow::Result<Vec<u8>> {
    platform::dpapi_unprotect(protected).await
}
