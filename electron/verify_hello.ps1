param([string]$message = "Verify your identity for QBrowse Passkey")
try {
    Add-Type -AssemblyName System.Runtime.WindowsRuntime
    $t = [Windows.Security.Credentials.UI.UserConsentVerifier, Windows.Security.Credentials.UI, ContentType = WindowsRuntime]
    $resType = $t.Assembly.GetType("Windows.Security.Credentials.UI.UserConsentVerificationResult")
    $availType = $t.Assembly.GetType("Windows.Security.Credentials.UI.UserConsentVerifierAvailability")

    $asTaskGeneric = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { 
        $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' 
    }

    $availOp = [Windows.Security.Credentials.UI.UserConsentVerifier]::CheckAvailabilityAsync()
    $availTask = $asTaskGeneric.MakeGenericMethod($availType).Invoke($null, @($availOp))
    $availTask.Wait()

    if ($availTask.Result.ToString() -ne 'Available') {
        Write-Output "NotAvailable"
        exit 0
    }

    $op = [Windows.Security.Credentials.UI.UserConsentVerifier]::RequestVerificationAsync($message)
    $task = $asTaskGeneric.MakeGenericMethod($resType).Invoke($null, @($op))
    $task.Wait()
    Write-Output $task.Result.ToString()
} catch {
    Write-Output "Error: $_"
}
