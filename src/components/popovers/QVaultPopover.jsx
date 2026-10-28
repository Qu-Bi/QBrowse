import React, { useState, useEffect, useRef } from 'react';
import {
    Lock, Unlock, KeyRound, Eye, EyeOff, Copy, Plus, Search,
    ShieldCheck, Check, X, RefreshCw, Globe, Fingerprint,
    Zap, Settings, ArrowLeft, Shield, Sparkles, Pencil, Trash2,
    CreditCard, MapPin, Building2, Phone, Mail, Calendar, Hash,
    UploadCloud, Download, ChevronDown, ExternalLink
} from 'lucide-react';
import useVaultStore from '../../store/useVaultStore';
import useUIStore, { getAnimationTimeout } from '../../store/useUIStore';
import useTabStore from '../../store/useTabStore';
import usePopoverAnchor from '../../hooks/usePopoverAnchor';
import { parseVaultContent } from '../../utils/vaultImporter';
import {
    cleanTotpSecret, isValidTotpSecret, parseOtpAuthUri,
    generateTotpCode, getTotpRemainingSeconds, formatTotpCode
} from '../../utils/totp';

function CountdownRing({ remaining, size = 26, strokeWidth = 2.5 }) {
    const radius = (size - strokeWidth * 2) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference * (1 - remaining / 30);
    const isUrgent = remaining <= 5;
    const isWarning = remaining <= 10;
    const strokeColor = isUrgent ? '#ef4444' : isWarning ? '#f59e0b' : 'var(--accent, #d4bc94)';

    return (
        <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="transform -rotate-90">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    className="opacity-15"
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className="transition-[stroke-dashoffset,stroke] duration-1000 ease-linear"
                />
            </svg>
            {size >= 22 && (
                <span className={`absolute text-[9px] font-mono font-bold leading-none select-none ${
                    isUrgent ? 'text-red-500' : isWarning ? 'text-amber-500' : 'opacity-85'
                }`}>
                    {remaining}
                </span>
            )}
        </div>
    );
}

export default function QVaultPopover({ isClosing }) {
    const {
        isUnlocked, isInitialized, masterPassword, pinEnabled, biometricsEnabled,
        unlock, unlockWithPin, unlockWithWindowsHello, enablePin, disablePin, setBiometrics,
        lock, passwords, fetchPasswords, addNewItem, deleteItem, updateItem,
        importBatchItems, exportVaultData, resetVault, isLoading, error
    } = useVaultStore();

    const showToast = useUIStore(state => state.showToast);
    const currentUrl = useUIStore(state => state.currentUrl);
    const theme = useUIStore(state => state.theme);
    const activeSpace = useTabStore(state => state.activeSpace);
    const isBright = theme === 'light' && activeSpace !== 'ghost' && activeSpace !== 'tor';

    // Live clock for TOTP updates
    const [now, setNow] = useState(Date.now());
    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(interval);
    }, []);

    const totpRemaining = getTotpRemainingSeconds(now);

    // Sync vault status on mount
    useEffect(() => {
        useVaultStore.getState().syncVaultStatus?.().then(status => {
            if (status?.hasPin) {
                setUnlockMode(prev => prev === 'password' && !masterPassInput ? 'pin' : prev);
            }
        }).catch(() => {});
    }, []);

    // View Modes: 'vault' | 'add' | 'settings'
    const [viewMode, setViewMode] = useState('vault');
    const [activePage, setActivePage] = useState('logins'); // 'logins' | '2fa' | 'wallet' | 'generator'
    const [hoveredActivePage, setHoveredActivePage] = useState(null);
    const [loginSubFilter, setLoginSubFilter] = useState('all'); // 'all' | 'passwords' | 'passkeys'
    const [expandedItemIds, setExpandedItemIds] = useState(new Set());
    const [unlockMode, setUnlockMode] = useState(pinEnabled ? 'pin' : 'password');
    const [editingItemId, setEditingItemId] = useState(null);

    const toggleItemExpanded = (id) => {
        setExpandedItemIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const [deletingIds, setDeletingIds] = useState(new Set());
    const [isExitingSettings, setIsExitingSettings] = useState(false);
    const [isExitingAdd, setIsExitingAdd] = useState(false);

    const handleCloseSettings = () => {
        setIsExitingSettings(true);
        const timeout = getAnimationTimeout(200);
        setTimeout(() => {
            setViewMode('vault');
            setIsExitingSettings(false);
        }, timeout);
    };

    const handleCloseAdd = () => {
        setIsExitingAdd(true);
        const timeout = getAnimationTimeout(200);
        setTimeout(() => {
            setViewMode('vault');
            setIsExitingAdd(false);
        }, timeout);
    };

    // Inputs & UX State
    const [masterPassInput, setMasterPassInput] = useState('');
    const [pinInput, setPinInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [revealedPasswords, setRevealedPasswords] = useState({});
    const [copiedId, setCopiedId] = useState(null);

    // Settings View Inputs
    const [newPinInput, setNewPinInput] = useState('');
    const [isSavingPin, setIsSavingPin] = useState(false);
    const [isTogglingBio, setIsTogglingBio] = useState(false);
    const [confirmReset, setConfirmReset] = useState(false);
    const [oldPassInput, setOldPassInput] = useState('');
    const [newMasterPass, setNewMasterPass] = useState('');
    const [confirmMasterPass, setConfirmMasterPass] = useState('');
    const [isChangingPass, setIsChangingPass] = useState(false);

    // Add Item Form Inputs: 'login' | 'totp' | 'card' | 'address' | 'passkey'
    const [newItemType, setNewItemType] = useState('login');
    const [title, setTitle] = useState('');
    const [url, setUrl] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showNewItemPassword, setShowNewItemPassword] = useState(false);
    const [totpSecret, setTotpSecret] = useState('');
    const [passkeyRpId, setPasskeyRpId] = useState('');
    const [passkeyCredId, setPasskeyCredId] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Credit Card Inputs
    const [cardholderName, setCardholderName] = useState('');
    const [cardNumber, setCardNumber] = useState('');
    const [cardExpMonth, setCardExpMonth] = useState('12');
    const [cardExpYear, setCardExpYear] = useState(String(new Date().getFullYear() + 3));
    const [cardCvv, setCardCvv] = useState('');
    const [cardBrand, setCardBrand] = useState('Visa');

    // Address Inputs
    const [fullName, setFullName] = useState('');
    const [streetAddress, setStreetAddress] = useState('');
    const [unit, setUnit] = useState('');
    const [city, setCity] = useState('');
    const [stateProvince, setStateProvince] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [country, setCountry] = useState('United States');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');

    // Generator Tab State
    const [genLength, setGenLength] = useState(16);
    const [useUpper, setUseUpper] = useState(true);
    const [useLower, setUseLower] = useState(true);
    const [useNumbers, setUseNumbers] = useState(true);
    const [useSymbols, setUseSymbols] = useState(true);
    const [generatedResult, setGeneratedResult] = useState('');

    const [hoveredUnlockMode, setHoveredUnlockMode] = useState(null);
    const [hoveredNewItemType, setHoveredNewItemType] = useState(null);

    const fileInputRef = useRef(null);
    const [isImporting, setIsImporting] = useState(false);

    const handleImportFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsImporting(true);
        try {
            const text = await file.text();
            const { parsed, sourceName } = parseVaultContent(text, file.name);

            if (parsed.length === 0) {
                showToast('No credentials found in file', 'error');
                setIsImporting(false);
                return;
            }

            const res = await importBatchItems(parsed);
            showToast(`Imported ${res.total} items from ${sourceName}!`);
            setViewMode('vault');
        } catch (err) {
            console.error("Import failed:", err);
            showToast(`Import failed: ${err.message}`, 'error');
        } finally {
            setIsImporting(false);
            if (e.target) e.target.value = '';
        }
    };

    useEffect(() => {
        if (isUnlocked) {
            fetchPasswords();
        }
    }, [isUnlocked, fetchPasswords]);

    useEffect(() => {
        generateCustomPassword();
    }, [genLength, useUpper, useLower, useNumbers, useSymbols]);

    const generateCustomPassword = () => {
        let chars = '';
        if (useUpper) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        if (useLower) chars += 'abcdefghijklmnopqrstuvwxyz';
        if (useNumbers) chars += '0123456789';
        if (useSymbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';
        if (!chars) chars = 'abcdefghijklmnopqrstuvwxyz';

        let res = '';
        for (let i = 0; i < genLength; i++) {
            res += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setGeneratedResult(res);
    };

    const detectCardBrand = (num) => {
        const clean = num.replace(/\D/g, '');
        if (clean.startsWith('4')) return 'Visa';
        if (/^5[1-5]/.test(clean) || /^2[2-7]/.test(clean)) return 'Mastercard';
        if (/^3[47]/.test(clean)) return 'American Express';
        if (/^6(?:011|5)/.test(clean)) return 'Discover';
        return 'Credit Card';
    };

    const formatCardNumberInput = (val) => {
        const digits = val.replace(/\D/g, '').substring(0, 16);
        return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
    };

    const handleTotpSecretChange = (val) => {
        setTotpSecret(val);
        if (val.trim().toLowerCase().startsWith('otpauth://')) {
            const parsed = parseOtpAuthUri(val.trim());
            if (parsed) {
                if (parsed.secret) {
                    setTotpSecret(parsed.secret);
                }
                if (!title && parsed.issuer) {
                    setTitle(parsed.issuer);
                }
                if (!username && parsed.account) {
                    setUsername(parsed.account);
                }
            }
        }
    };

    const handleUnlockSubmit = async (e) => {
        e.preventDefault();
        if (unlockMode === 'password') {
            if (!masterPassInput.trim()) return;
            const success = await unlock(masterPassInput);
            if (success) {
                setMasterPassInput('');
            }
        } else {
            if (!pinInput.trim()) return;
            const success = await unlockWithPin(pinInput);
            if (success) {
                setPinInput('');
            }
        }
    };

    const handleSavePin = async (e) => {
        e.preventDefault();
        if (!newPinInput || newPinInput.length < 4) {
            showToast('PIN must be 4 to 6 digits', 'error');
            return;
        }
        setIsSavingPin(true);
        try {
            const ok = await enablePin(newPinInput);
            if (ok) {
                showToast('Quick PIN configured securely');
                setNewPinInput('');
            } else {
                showToast('Failed to configure PIN', 'error');
            }
        } catch (err) {
            showToast(err.message || 'Failed to save PIN', 'error');
        } finally {
            setIsSavingPin(false);
        }
    };

    const handleDisablePin = async () => {
        try {
            const ok = await disablePin();
            if (ok) {
                showToast('Quick PIN removed');
                setNewPinInput('');
            }
        } catch (err) {
            showToast('Failed to remove PIN', 'error');
        }
    };

    const handleToggleBiometrics = async () => {
        setIsTogglingBio(true);
        try {
            const target = !biometricsEnabled;
            const ok = await setBiometrics(target);
            if (ok) {
                showToast(target ? 'Windows Hello biometric unlock enabled' : 'Windows Hello biometric unlock disabled');
            } else {
                showToast('Windows Hello verification cancelled or failed', 'error');
            }
        } catch (err) {
            showToast(err.message || 'Windows Hello error', 'error');
        } finally {
            setIsTogglingBio(false);
        }
    };

    const handleChangeMasterPassword = async (e) => {
        e.preventDefault();
        if (!oldPassInput || !newMasterPass) {
            showToast('All fields are required', 'error');
            return;
        }
        if (newMasterPass !== confirmMasterPass) {
            showToast('New passwords do not match', 'error');
            return;
        }
        setIsChangingPass(true);
        try {
            const res = await useVaultStore.getState().changeMasterPassword(oldPassInput, newMasterPass);
            if (res?.success) {
                showToast('Master Password updated & synced across QVault');
                setOldPassInput('');
                setNewMasterPass('');
                setConfirmMasterPass('');
                setViewMode('vault');
            } else {
                showToast(res?.error || 'Current master password is incorrect', 'error');
            }
        } catch (err) {
            showToast(err.message || 'Failed to change password', 'error');
        } finally {
            setIsChangingPass(false);
        }
    };

    const handleConfirmResetVault = async () => {
        try {
            await resetVault();
            setConfirmReset(false);
            setViewMode('vault');
            showToast('Local vault reset. You can now set a new Master Password.');
        } catch (err) {
            showToast(err.message || 'Failed to reset vault', 'error');
        }
    };

    const handleOpenAddForm = (type = 'login') => {
        setEditingItemId(null);
        setNewItemType(type);
        setViewMode('add');
        setTotpSecret('');
        setShowNewItemPassword(false);

        if (currentUrl && currentUrl !== 'about:blank') {
            try {
                const u = new URL(currentUrl);
                const hostClean = u.hostname.replace('www.', '');
                setTitle(type === 'login' ? hostClean : (type === 'totp' ? `${hostClean} (2FA)` : (type === 'card' ? 'My Card' : (type === 'address' ? 'Home Address' : hostClean))));
                setUrl(currentUrl);
                setPasskeyRpId(u.hostname);
            } catch {
                setTitle(type === 'card' ? 'My Card' : (type === 'address' ? 'Home Address' : ''));
                setUrl(currentUrl);
                setPasskeyRpId('');
            }
        } else {
            setTitle(type === 'card' ? 'My Card' : (type === 'address' ? 'Home Address' : ''));
            setUrl('');
            setPasskeyRpId('');
        }

        setUsername('');
        setPassword('');
        setPasskeyCredId('');
        setCardholderName('');
        setCardNumber('');
        setCardExpMonth('12');
        setCardExpYear(String(new Date().getFullYear() + 3));
        setCardCvv('');
        setCardBrand('Visa');
        setFullName('');
        setStreetAddress('');
        setUnit('');
        setCity('');
        setStateProvince('');
        setPostalCode('');
        setCountry('United States');
        setPhone('');
        setEmail('');
    };

    const handleOpenEditForm = (item) => {
        setEditingItemId(item.id);
        const itemType = item.itemType || 'login';
        setNewItemType(itemType);
        setTitle(item.title || '');
        setUsername(item.username || '');
        setPassword(item.password || '');
        setShowNewItemPassword(false);
        setUrl(item.url || '');
        setTotpSecret(item.totpSecret || (itemType === 'totp' ? item.password : '') || '');
        setPasskeyRpId(item.passkeyData?.rpId || item.url || '');
        setPasskeyCredId(item.passkeyData?.credentialId || '');

        if (item.cardData) {
            setCardholderName(item.cardData.cardholderName || '');
            setCardNumber(formatCardNumberInput(item.cardData.cardNumber || item.password || ''));
            setCardExpMonth(item.cardData.expMonth || '12');
            setCardExpYear(item.cardData.expYear || String(new Date().getFullYear() + 3));
            setCardCvv(item.cardData.cvv || '');
            setCardBrand(item.cardData.cardBrand || 'Visa');
        } else {
            setCardholderName(item.username || '');
            setCardNumber(formatCardNumberInput(item.password || ''));
            setCardExpMonth('12');
            setCardExpYear(String(new Date().getFullYear() + 3));
            setCardCvv('');
            setCardBrand('Visa');
        }

        if (item.addressData) {
            setFullName(item.addressData.fullName || item.title || '');
            setStreetAddress(item.addressData.streetAddress || '');
            setUnit(item.addressData.unit || '');
            setCity(item.addressData.city || '');
            setStateProvince(item.addressData.state || '');
            setPostalCode(item.addressData.postalCode || '');
            setCountry(item.addressData.country || 'United States');
            setPhone(item.addressData.phone || '');
            setEmail(item.addressData.email || item.username || '');
        } else {
            setFullName(item.title || '');
            setStreetAddress('');
            setUnit('');
            setCity('');
            setStateProvince('');
            setPostalCode('');
            setCountry('United States');
            setPhone('');
            setEmail(item.username || '');
        }

        setViewMode('add');
    };

    const handleDeleteItem = async (id, itemTitle) => {
        try {
            setDeletingIds(prev => new Set(prev).add(id));
            await deleteItem(id);
            showToast(`Deleted ${itemTitle} from QVault`);
        } catch (err) {
            showToast(`Delete failed: ${err.message || err}`, 'error');
        } finally {
            setDeletingIds(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    };

    const handleSaveNewItem = async (e) => {
        e.preventDefault();
        if (!title.trim()) {
            showToast('Title / Nickname is required', 'error');
            return;
        }

        if (newItemType === 'totp' && !cleanTotpSecret(totpSecret || password)) {
            showToast('A valid 2FA Secret Key is required', 'error');
            return;
        }

        setIsSaving(true);
        try {
            let passkeyData = null;
            let cardData = null;
            let addressData = null;
            let finalUsername = username;
            let finalPassword = password;
            let finalTotpSecret = cleanTotpSecret(totpSecret);

            if (newItemType === 'totp') {
                if (!finalTotpSecret && password) {
                    finalTotpSecret = cleanTotpSecret(password);
                }
                finalUsername = username.trim() || '2FA Authenticator';
                finalPassword = password.trim() || finalTotpSecret;
            } else if (newItemType === 'passkey') {
                const credId = passkeyCredId.trim() || ('pk_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now().toString(36));
                const existingPubKey = (editingItemId && passwords.find(p => p.id === editingItemId)?.passkeyData?.publicKey) || null;
                let pubKey = existingPubKey;
                try {
                    if (password && password.startsWith('{')) {
                        const parsed = JSON.parse(password);
                        if (parsed.publicKey) pubKey = parsed.publicKey;
                    }
                } catch { }

                passkeyData = {
                    rpId: passkeyRpId || url || title,
                    credentialId: credId,
                    publicKey: pubKey,
                    created: Date.now()
                };
            } else if (newItemType === 'card') {
                const cleanNumber = cardNumber.replace(/\s+/g, '');
                cardData = {
                    cardholderName: cardholderName.trim(),
                    cardNumber: cleanNumber,
                    expMonth: cardExpMonth.trim(),
                    expYear: cardExpYear.trim(),
                    cvv: cardCvv.trim(),
                    cardBrand: cardBrand || detectCardBrand(cleanNumber)
                };
                finalUsername = cardholderName.trim() || `Card ending in ${cleanNumber.slice(-4)}`;
                finalPassword = cleanNumber;
            } else if (newItemType === 'address') {
                addressData = {
                    fullName: fullName.trim(),
                    streetAddress: streetAddress.trim(),
                    unit: unit.trim(),
                    city: city.trim(),
                    state: stateProvince.trim(),
                    postalCode: postalCode.trim(),
                    country: country.trim(),
                    phone: phone.trim(),
                    email: email.trim()
                };
                finalUsername = fullName.trim() || [city, country].filter(Boolean).join(', ');
                finalPassword = [streetAddress, unit, city, stateProvince, postalCode, country].filter(Boolean).join(', ');
            }

            if (editingItemId) {
                await updateItem({
                    id: editingItemId,
                    type: newItemType,
                    title: title.trim(),
                    username: finalUsername,
                    password: finalPassword,
                    url,
                    totpSecret: finalTotpSecret,
                    passkeyData,
                    cardData,
                    addressData
                });
                showToast(`Updated ${title}!`);
            } else {
                await addNewItem({
                    type: newItemType,
                    title: title.trim(),
                    username: finalUsername,
                    password: finalPassword,
                    url,
                    totpSecret: finalTotpSecret,
                    passkeyData,
                    cardData,
                    addressData
                });
                showToast(`Saved ${title}!`);
            }

            setEditingItemId(null);
            setViewMode('vault');
        } catch (err) {
            showToast('Failed to save item: ' + err.message, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleAutofillPage = (entry) => {
        const { privateTabs, workTabs, ghostTabs, torTabs, activeSpace } = useTabStore.getState();
        const tabs = activeSpace === 'personal' ? privateTabs : activeSpace === 'work' ? workTabs : activeSpace === 'tor' ? (torTabs || []) : ghostTabs;
        const activeTabObj = tabs.find(t => t.active);

        if (activeTabObj) {
            const wv = document.getElementById(`webview-${activeTabObj.id}`);
            if (wv && wv.executeJavaScript) {
                let code = '';
                if (entry.itemType === 'card' && entry.cardData) {
                    code = `
                        (() => {
                            const setVal = (el, val) => {
                                if (!el || !val) return false;
                                el.focus();
                                el.value = val;
                                el.dispatchEvent(new Event('input', { bubbles: true }));
                                el.dispatchEvent(new Event('change', { bubbles: true }));
                                return true;
                            };
                            let filled = false;
                            const card = ${JSON.stringify(entry.cardData)};

                            const numInputs = document.querySelectorAll('input[autocomplete*="cc-number"], input[name*="cardnumber" i], input[name*="card_number" i], input[name*="cardNumber" i], input[name*="creditcard" i], input[id*="card" i], input[id*="cc_num" i], input[name*="pan" i]');
                            if (numInputs.length > 0 && card.cardNumber) {
                                filled = setVal(numInputs[0], card.cardNumber) || filled;
                            }

                            const nameInputs = document.querySelectorAll('input[autocomplete*="cc-name"], input[name*="cardholder" i], input[name*="card_name" i], input[name*="ccname" i], input[id*="cardholder" i]');
                            if (nameInputs.length > 0 && card.cardholderName) {
                                filled = setVal(nameInputs[0], card.cardholderName) || filled;
                            }

                            const expCombined = document.querySelectorAll('input[autocomplete*="cc-exp"], input[name*="exp" i], input[id*="exp" i]');
                            if (expCombined.length > 0 && card.expMonth && card.expYear) {
                                const yrShort = card.expYear.slice(-2);
                                filled = setVal(expCombined[0], card.expMonth + '/' + yrShort) || filled;
                            }
                            const monthInputs = document.querySelectorAll('select[autocomplete*="cc-exp-month"], select[name*="month" i], input[name*="exp_month" i], select[id*="month" i]');
                            if (monthInputs.length > 0 && card.expMonth) {
                                filled = setVal(monthInputs[0], card.expMonth) || filled;
                            }
                            const yearInputs = document.querySelectorAll('select[autocomplete*="cc-exp-year"], select[name*="year" i], input[name*="exp_year" i], select[id*="year" i]');
                            if (yearInputs.length > 0 && card.expYear) {
                                filled = setVal(yearInputs[0], card.expYear) || filled;
                            }

                            const cvvInputs = document.querySelectorAll('input[autocomplete*="cc-csc"], input[name*="cvv" i], input[name*="cvc" i], input[name*="securitycode" i], input[id*="cvv" i], input[id*="cvc" i]');
                            if (cvvInputs.length > 0 && card.cvv) {
                                filled = setVal(cvvInputs[0], card.cvv) || filled;
                            }

                            return filled;
                        })();
                    `;
                } else if (entry.itemType === 'address' && entry.addressData) {
                    code = `
                        (() => {
                            const setVal = (el, val) => {
                                if (!el || !val) return false;
                                el.focus();
                                el.value = val;
                                el.dispatchEvent(new Event('input', { bubbles: true }));
                                el.dispatchEvent(new Event('change', { bubbles: true }));
                                return true;
                            };
                            let filled = false;
                            const addr = ${JSON.stringify(entry.addressData)};

                            const nameInputs = document.querySelectorAll('input[autocomplete="name"], input[name*="fullname" i], input[name*="name" i]:not([name*="user"]):not([name*="card"])');
                            if (nameInputs.length > 0 && addr.fullName) {
                                filled = setVal(nameInputs[0], addr.fullName) || filled;
                            }

                            const emailInputs = document.querySelectorAll('input[type="email"], input[autocomplete*="email"], input[name*="email" i]');
                            if (emailInputs.length > 0 && addr.email) {
                                filled = setVal(emailInputs[0], addr.email) || filled;
                            }

                            const telInputs = document.querySelectorAll('input[type="tel"], input[autocomplete*="tel"], input[name*="phone" i], input[name*="tel" i]');
                            if (telInputs.length > 0 && addr.phone) {
                                filled = setVal(telInputs[0], addr.phone) || filled;
                            }

                            const streetInputs = document.querySelectorAll('input[autocomplete*="address-line1"], input[autocomplete*="street-address"], input[name*="address1" i], input[name*="street" i], input[id*="address1" i]');
                            if (streetInputs.length > 0 && addr.streetAddress) {
                                filled = setVal(streetInputs[0], addr.streetAddress) || filled;
                            }

                            const unitInputs = document.querySelectorAll('input[autocomplete*="address-line2"], input[name*="address2" i], input[name*="apt" i], input[name*="suite" i]');
                            if (unitInputs.length > 0 && addr.unit) {
                                filled = setVal(unitInputs[0], addr.unit) || filled;
                            }

                            const cityInputs = document.querySelectorAll('input[autocomplete*="address-level2"], input[name*="city" i], input[id*="city" i]');
                            if (cityInputs.length > 0 && addr.city) {
                                filled = setVal(cityInputs[0], addr.city) || filled;
                            }

                            const stateInputs = document.querySelectorAll('input[autocomplete*="address-level1"], select[autocomplete*="address-level1"], input[name*="state" i], select[name*="state" i], input[name*="province" i]');
                            if (stateInputs.length > 0 && addr.state) {
                                filled = setVal(stateInputs[0], addr.state) || filled;
                            }

                            const zipInputs = document.querySelectorAll('input[autocomplete*="postal-code"], input[name*="zip" i], input[name*="postal" i], input[id*="zip" i]');
                            if (zipInputs.length > 0 && addr.postalCode) {
                                filled = setVal(zipInputs[0], addr.postalCode) || filled;
                            }

                            const countryInputs = document.querySelectorAll('select[autocomplete*="country"], select[name*="country" i], input[name*="country" i]');
                            if (countryInputs.length > 0 && addr.country) {
                                filled = setVal(countryInputs[0], addr.country) || filled;
                            }

                            return filled;
                        })();
                    `;
                } else {
                    code = `
                        (() => {
                            const userInputs = document.querySelectorAll('input[type="text"], input[type="email"], input[name*="user"], input[name*="login"], input[autocomplete*="username"]');
                            const passInputs = document.querySelectorAll('input[type="password"], input[name*="pass"], input[autocomplete*="password"]');
                            let filled = false;
                            if (userInputs.length > 0 && ${JSON.stringify(entry.username || '')}) {
                                userInputs[0].value = ${JSON.stringify(entry.username || '')};
                                userInputs[0].dispatchEvent(new Event('input', { bubbles: true }));
                                userInputs[0].dispatchEvent(new Event('change', { bubbles: true }));
                                filled = true;
                            }
                            if (passInputs.length > 0 && ${JSON.stringify(entry.password || '')}) {
                                passInputs[0].value = ${JSON.stringify(entry.password || '')};
                                passInputs[0].dispatchEvent(new Event('input', { bubbles: true }));
                                passInputs[0].dispatchEvent(new Event('change', { bubbles: true }));
                                filled = true;
                            }
                            return filled;
                        })();
                    `;
                }

                wv.executeJavaScript(code).then((res) => {
                    showToast(res ? `Autofilled ${entry.title}!` : `Autofill completed for ${entry.title}`);
                }).catch(() => {
                    if (entry.password) {
                        navigator.clipboard.writeText(entry.password);
                        showToast(`Copied data for ${entry.title}!`);
                    }
                });
            }
        }
    };

    const toggleReveal = (id) => {
        setRevealedPasswords(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const copyToClipboard = (text, label, id) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedId(`${label}-${id}`);
        showToast(`Copied ${label}!`);
        setTimeout(() => setCopiedId(null), 2000);
    };

    // Process stored items
    const parsedItems = passwords.map(p => {
        let meta = {
            type: p.itemType || 'login',
            totpSecret: p.totpSecret || null,
            passkeyData: p.passkeyData || null,
            cardData: p.cardData || null,
            addressData: p.addressData || null
        };
        let cleanTitle = p.title || '';
        if (cleanTitle.includes('|||')) {
            const parts = cleanTitle.split('|||');
            cleanTitle = parts[0];
            try {
                const parsed = JSON.parse(parts[1]);
                meta = {
                    type: parsed.type || meta.type,
                    totpSecret: parsed.totpSecret !== undefined ? parsed.totpSecret : meta.totpSecret,
                    passkeyData: parsed.passkeyData || meta.passkeyData,
                    cardData: parsed.cardData || meta.cardData,
                    addressData: parsed.addressData || meta.addressData
                };
            } catch { }
        }
        const effectiveType = p.itemType || meta.type || 'login';
        const effectiveTotpSecret = p.totpSecret || meta.totpSecret || (effectiveType === 'totp' ? p.password : null) || null;
        return {
            ...p,
            title: cleanTitle,
            itemType: effectiveType,
            totpSecret: effectiveTotpSecret,
            passkeyData: p.passkeyData || meta.passkeyData || null,
            cardData: p.cardData || meta.cardData || null,
            addressData: p.addressData || meta.addressData || null
        };
    });

    // Deduplicate parsedItems by unique signature to avoid duplicate cards in the list
    const dedupedItemsMap = new Map();
    parsedItems.forEach(p => {
        const sig = `${p.itemType}::${(p.title || '').trim().toLowerCase()}::${(p.username || '').trim().toLowerCase()}::${(p.url || p.passkeyData?.rpId || '').trim().toLowerCase()}`;
        if (!dedupedItemsMap.has(sig)) {
            dedupedItemsMap.set(sig, p);
        } else {
            const existing = dedupedItemsMap.get(sig);
            dedupedItemsMap.set(sig, {
                ...existing,
                passkeyData: existing.passkeyData || p.passkeyData,
                totpSecret: existing.totpSecret || p.totpSecret,
                password: existing.password || p.password
            });
        }
    });
    const cleanItems = Array.from(dedupedItemsMap.values());

    const loginItems = cleanItems.filter(p => p.itemType === 'login' || p.itemType === 'passkey');
    const passwordsCount = cleanItems.filter(p => p.itemType === 'login').length;
    const passkeysCount = cleanItems.filter(p => p.itemType === 'passkey').length;
    const loginsCount = loginItems.length;

    const totpItems = cleanItems.filter(p => p.totpSecret || p.itemType === 'totp');
    const walletItems = cleanItems.filter(p => p.itemType === 'card' || p.itemType === 'address');

    const filterBySearch = (items) => {
        if (!searchQuery.trim()) return items;
        const q = searchQuery.toLowerCase();
        return items.filter(item => (
            item.title.toLowerCase().includes(q) ||
            item.username?.toLowerCase().includes(q) ||
            item.url?.toLowerCase().includes(q) ||
            item.passkeyData?.rpId?.toLowerCase().includes(q) ||
            item.cardData?.cardholderName?.toLowerCase().includes(q) ||
            item.addressData?.fullName?.toLowerCase().includes(q) ||
            item.addressData?.city?.toLowerCase().includes(q)
        ));
    };

    const currentTabFilteredItems = (() => {
        if (activePage === 'logins') {
            const subFiltered = loginItems.filter(item => {
                if (loginSubFilter === 'passwords') return item.itemType === 'login';
                if (loginSubFilter === 'passkeys') return item.itemType === 'passkey';
                return true;
            });
            return filterBySearch(subFiltered);
        }
        if (activePage === '2fa') return filterBySearch(totpItems);
        if (activePage === 'wallet') return filterBySearch(walletItems);
        return [];
    })();

    const currentDomain = (() => {
        if (!currentUrl || currentUrl === 'about:blank') return '';
        try {
            return new URL(currentUrl).hostname.replace('www.', '').toLowerCase();
        } catch {
            return '';
        }
    })();

    const domainsMatch = (d1, d2) => {
        if (!d1 || !d2) return false;
        const clean1 = String(d1).replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0].split(':')[0].toLowerCase();
        const clean2 = String(d2).replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0].split(':')[0].toLowerCase();
        if (clean1 === clean2) return true;
        if (clean1.endsWith('.' + clean2) || clean2.endsWith('.' + clean1)) return true;
        const getRoots = (h) => {
            const parts = h.split('.');
            const c = [h];
            if (parts.length >= 2) c.push(parts.slice(-2).join('.'));
            if (parts.length >= 3) c.push(parts.slice(-3).join('.'));
            return c;
        };
        const r1 = getRoots(clean1);
        const r2 = getRoots(clean2);
        return r1.some(r => r2.includes(r));
    };

    const matchingSiteItems = loginItems.filter(item => {
        if (!currentDomain) return false;
        const itemHost = item.url || item.passkeyData?.rpId || item.title || '';
        return domainsMatch(currentDomain, itemHost);
    });

    const previewTotpCode = isValidTotpSecret(totpSecret) ? generateTotpCode(totpSecret, now) : null;

    const cardClass = isBright ? 'bg-black/[0.035] border-black/[0.06]' : 'bg-black/25 border-white/[0.08]';
    const inputClass = isBright
        ? 'bg-black/[0.04] border-black/[0.10] focus:border-accent focus:bg-white text-zinc-900 placeholder-zinc-400'
        : 'bg-black/30 border-white/[0.10] focus:border-accent focus:bg-black/40 text-white placeholder-white/45';
    const labelClass = isBright
        ? 'text-[10px] font-mono text-zinc-600 font-semibold'
        : 'text-[10px] font-mono text-white/75';

    const anchor = usePopoverAnchor('#tour-vault-trigger', 460, { defaultRight: 16 });

    return (
        <div
            id="popover-vault-container"
            data-testid="qvault-popover"
            onClick={e => e.stopPropagation()}
            onContextMenu={e => { e.preventDefault(); e.stopPropagation(); }}
            style={{
                ...anchor.style,
                backgroundColor: isBright ? 'rgba(255, 255, 255, 0.72)' : 'rgba(18, 20, 32, 0.58)',
                backdropFilter: isBright
                    ? 'blur(var(--glass-blur, 32px)) saturate(180%) brightness(1.04)'
                    : 'blur(var(--glass-blur, 32px)) saturate(190%) brightness(0.75)',
                WebkitBackdropFilter: isBright
                    ? 'blur(var(--glass-blur, 32px)) saturate(180%) brightness(1.04)'
                    : 'blur(var(--glass-blur, 32px)) saturate(190%) brightness(0.75)'
            }}
            className={`absolute z-[70000] w-[460px] max-w-[calc(100vw-32px)] rounded-3xl overflow-hidden p-4 transition-all duration-200 border ${isBright
                    ? 'border-black/[0.08] text-zinc-900 shadow-[0_20px_60px_rgba(0,0,0,0.14),inset_0_1px_1px_rgba(255,255,255,0.85)]'
                    : 'border-white/[0.10] text-white/95 shadow-[0_25px_70px_rgba(0,0,0,0.65),inset_0_1px_1px_rgba(255,255,255,0.16)]'
                } ${isClosing ? 'animate-slide-up-fade-out' : 'animate-slide-down-fade'}`}
        >
            {/* Header */}
            <div className={`flex items-center justify-between pb-3 border-b mb-3.5 ${isBright ? 'border-black/[0.06]' : 'border-white/[0.08]'}`}>
                <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-colors ${isUnlocked
                            ? (isBright ? 'bg-emerald-50 text-emerald-600 border-emerald-200 shadow-xs' : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30')
                            : (isBright ? 'bg-black/[0.04] text-zinc-700 border-black/10 shadow-xs' : 'bg-white/[0.06] text-white/75 border-white/[0.08]')
                        }`}>
                        {isUnlocked ? <Unlock size={14} /> : <Lock size={14} />}
                    </div>
                    <div>
                        <h3 className={`text-xs font-bold tracking-tight ${isBright ? 'text-zinc-950' : 'text-white'}`}>QVault</h3>
                        <p className={`text-[10px] font-mono ${isBright ? 'text-zinc-600' : 'text-white/70'}`}>{isUnlocked ? `${passwords.length} saved items` : 'AES-256 Encrypted Vault'}</p>
                    </div>
                </div>

                {isUnlocked && (
                    <div className="flex items-center gap-1.5">
                        <button onClick={() => setViewMode(viewMode === 'settings' ? 'vault' : 'settings')} className={`w-8 h-8 rounded-full flex items-center justify-center border transition active:scale-95 cursor-pointer ${viewMode === 'settings'
                                ? (isBright ? 'bg-accent/20 text-zinc-900 border-accent/40 font-bold' : 'bg-accent/20 text-accent border-accent/40')
                                : (isBright ? 'bg-black/[0.03] border-black/10 text-zinc-600 hover:text-zinc-900 hover:bg-black/[0.06]' : 'bg-white/[0.06] border-white/[0.08] text-white/75 hover:text-white hover:bg-white/10')
                            }`} title="Vault Settings">
                            <Settings size={14} />
                        </button>
                        <button onClick={() => handleOpenAddForm(activePage === '2fa' ? 'totp' : activePage === 'wallet' ? 'card' : 'login')} className="px-3 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 cursor-pointer bg-accent hover:brightness-110 text-zinc-950 border-accent/40 shadow-xs" title="Add to Vault">
                            <Plus size={13} strokeWidth={2.5} /> Add
                        </button>
                        <button onClick={lock} className={`w-8 h-8 rounded-full flex items-center justify-center border text-xs transition active:scale-95 cursor-pointer ${isBright
                                ? 'bg-black/[0.03] border-black/10 text-zinc-600 hover:text-zinc-900 hover:bg-black/[0.06]'
                                : 'bg-white/[0.06] border-white/[0.08] text-white/75 hover:text-white hover:bg-white/10'
                            }`} title="Lock Vault">
                            <Lock size={14} />
                        </button>
                    </div>
                )}
            </div>

            {/* LOCKED VIEW */}
            {!isUnlocked ? (
                <div className="flex flex-col gap-3.5 py-1">
                    {/* Unlock Mode Selector */}
                    {pinEnabled && (
                        <div onMouseLeave={() => setHoveredUnlockMode(null)} className={`relative flex p-1 rounded-full border shadow-xs transition-colors duration-200 select-none ${isBright
                                ? 'bg-black/[0.03] border-black/[0.05]'
                                : 'bg-black/25 border-white/[0.08]'
                            }`}>
                            {hoveredUnlockMode && hoveredUnlockMode !== unlockMode && (
                                <div
                                    className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full transition-all duration-200 pointer-events-none ${
                                        isBright ? 'bg-black/[0.04]' : 'bg-white/[0.06]'
                                    }`}
                                    style={{
                                        transform: hoveredUnlockMode === 'password' ? 'translateX(100%)' : 'translateX(0)',
                                    }}
                                />
                            )}
                            <div
                                className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${isBright
                                        ? 'bg-white border border-black/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
                                        : 'bg-white/[0.12] border border-white/20 shadow-xs'
                                    }`}
                                style={{
                                    transform: unlockMode === 'password' ? 'translateX(100%)' : 'translateX(0)',
                                }}
                            />
                            <button
                                type="button"
                                onMouseEnter={() => setHoveredUnlockMode('pin')}
                                onClick={() => setUnlockMode('pin')}
                                className={`relative z-10 flex-1 py-1.5 text-center text-[11px] font-semibold rounded-full transition-all duration-300 active:scale-95 cursor-pointer ${unlockMode === 'pin'
                                        ? (isBright ? 'text-zinc-950 font-bold' : 'text-accent font-bold')
                                        : (isBright ? 'text-zinc-600 hover:text-zinc-900' : 'text-white/70 hover:text-white')
                                    }`}
                            >
                                Quick PIN
                            </button>
                            <button
                                type="button"
                                onMouseEnter={() => setHoveredUnlockMode('password')}
                                onClick={() => setUnlockMode('password')}
                                className={`relative z-10 flex-1 py-1.5 text-center text-[11px] font-semibold rounded-full transition-all duration-300 active:scale-95 cursor-pointer ${unlockMode === 'password'
                                        ? (isBright ? 'text-zinc-950 font-bold' : 'text-accent font-bold')
                                        : (isBright ? 'text-zinc-600 hover:text-zinc-900' : 'text-white/70 hover:text-white')
                                    }`}
                            >
                                Master Password
                            </button>
                        </div>
                    )}

                    <form onSubmit={handleUnlockSubmit} className="flex flex-col gap-3.5">
                        <div className={`p-3.5 rounded-2xl flex items-center gap-3 border ${cardClass}`}>
                            <Shield size={18} className="text-accent shrink-0" />
                            <div className={`text-[11px] leading-relaxed ${isBright ? 'text-zinc-700 font-medium' : 'text-white/85 font-medium'}`}>
                                {!isInitialized
                                    ? 'Set a Master Password to initialize your encrypted QVault.'
                                    : unlockMode === 'pin'
                                        ? 'Enter your quick PIN to unlock QVault.'
                                        : 'Enter your Master Password to decrypt passwords, 2FA codes, cards, and addresses.'}
                            </div>
                        </div>

                        {unlockMode === 'password' ? (
                            <div className="flex flex-col gap-1.5">
                                <label className={`text-[10px] font-mono uppercase tracking-wider px-1 font-bold ${isBright ? 'text-zinc-700' : 'text-white/75'}`}>
                                    {isInitialized ? 'Master Password' : 'Create Master Password'}
                                </label>
                                <input
                                    type="password"
                                    autoFocus
                                    value={masterPassInput}
                                    onChange={(e) => setMasterPassInput(e.target.value)}
                                    placeholder={isInitialized ? "Enter master password..." : "Create master password..."}
                                    className={`w-full h-10 rounded-full px-4 text-xs font-mono outline-none transition-all border ${inputClass}`}
                                />
                            </div>
                        ) : (
                            <div className="flex flex-col gap-1.5">
                                <label className={`text-[10px] font-mono uppercase tracking-wider px-1 font-bold ${isBright ? 'text-zinc-700' : 'text-white/75'}`}>PIN Code</label>
                                <input
                                    type="password"
                                    autoFocus
                                    maxLength={6}
                                    value={pinInput}
                                    onChange={(e) => setPinInput(e.target.value)}
                                    placeholder="••••"
                                    className={`w-full h-10 rounded-full px-4 text-center text-lg font-mono tracking-[0.5em] outline-none transition-all border ${inputClass}`}
                                />
                            </div>
                        )}

                        {error && (
                            <div className="flex flex-col gap-1.5">
                                <div className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 px-3.5 py-2.5 rounded-2xl font-mono font-medium">
                                    {error}
                                </div>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        if (window.confirm("Reset local vault? This will erase locally stored credentials on this device so you can initialize a fresh vault.")) {
                                            await resetVault();
                                            showToast("Local vault reset. You can now set a new Master Password.");
                                        }
                                    }}
                                    className={`text-[11px] underline font-mono text-center cursor-pointer transition py-0.5 active:scale-95 ${
                                        isBright ? 'text-zinc-500 hover:text-red-600' : 'text-white/65 hover:text-red-400'
                                    }`}
                                >
                                    Forgot password? Reset local vault
                                </button>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-10 mt-1 rounded-full font-bold text-xs flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-95 disabled:opacity-40 shadow-sm cursor-pointer border bg-accent hover:brightness-110 text-zinc-950 border-accent/40"
                        >
                            {isLoading ? <RefreshCw size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                            {!isInitialized ? 'Initialize Vault' : 'Unlock Vault'}
                        </button>

                        {biometricsEnabled && (
                            <button
                                type="button"
                                disabled={isLoading}
                                onClick={async () => {
                                    const ok = await unlockWithWindowsHello();
                                    if (ok) showToast('Unlocked via Windows Hello');
                                }}
                                className={`w-full h-10 rounded-full font-semibold text-xs flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 cursor-pointer border ${isBright
                                        ? 'bg-black/[0.04] hover:bg-black/[0.08] text-zinc-800 border-black/10 shadow-xs'
                                        : 'bg-white/[0.08] hover:bg-white/[0.12] text-white border-white/10'
                                    }`}
                            >
                                <Fingerprint size={14} className="text-accent" /> Unlock with Windows Hello
                            </button>
                        )}
                    </form>
                </div>
            ) : viewMode === 'settings' ? (
                /* SETTINGS VIEW */
                <div className={`flex flex-col gap-3.5 py-1 ${isExitingSettings ? 'animate-slide-out-right pointer-events-none' : 'animate-slide-in-right'}`}>

                    <div className={`flex justify-between items-center pb-2 border-b ${isBright ? 'border-black/[0.06]' : 'border-white/[0.08]'}`}>
                        <button onClick={handleCloseSettings} className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition active:scale-95 cursor-pointer ${
                            isBright ? 'text-zinc-700 hover:text-zinc-950 hover:bg-black/[0.04]' : 'text-white/85 hover:text-white hover:bg-white/[0.06]'
                        }`}>
                            <ArrowLeft size={13} /> Vault Settings
                        </button>
                    </div>

                    {/* Quick PIN Settings */}
                    <form onSubmit={handleSavePin} className={`p-3 border rounded-2xl flex flex-col gap-2 ${cardClass}`}>
                        <div className="flex items-center justify-between">
                            <span className={`text-xs font-semibold ${isBright ? 'text-zinc-900' : 'text-white'}`}>Quick PIN Unlock</span>
                            {pinEnabled && (
                                <button
                                    type="button"
                                    onClick={handleDisablePin}
                                    className={`text-[10px] font-mono transition cursor-pointer active:scale-95 ${
                                        isBright ? 'text-red-600 hover:text-red-700' : 'text-red-400 hover:text-red-300'
                                    }`}
                                >
                                    Remove PIN
                                </button>
                            )}
                        </div>
                        <p className={`text-[11px] font-mono ${isBright ? 'text-zinc-600' : 'text-white/70'}`}>Set a 4-6 digit PIN for fast vault access.</p>
                        <div className="flex gap-2 mt-1">
                            <input
                                type="password"
                                maxLength={6}
                                placeholder={pinEnabled ? "Change PIN (4-6 digits)" : "Set PIN (4-6 digits)"}
                                value={newPinInput}
                                onChange={e => setNewPinInput(e.target.value.replace(/\D/g, ''))}
                                className={`flex-1 h-9 border rounded-full px-3.5 text-center text-xs font-mono tracking-widest outline-none transition-colors ${inputClass}`}
                            />
                            <button
                                type="submit"
                                disabled={isSavingPin || !newPinInput}
                                className="px-4 h-9 rounded-full bg-accent hover:brightness-110 active:scale-95 text-zinc-950 font-bold border border-accent/40 text-xs transition cursor-pointer disabled:opacity-40 shadow-xs"
                            >
                                {isSavingPin ? 'Saving...' : 'Save PIN'}
                            </button>
                        </div>
                    </form>

                    {/* Windows Hello Biometrics */}
                    <div className={`p-3 border rounded-2xl flex items-center justify-between ${cardClass}`}>
                        <div className="flex flex-col gap-0.5">
                            <span className={`text-xs font-semibold flex items-center gap-1.5 ${isBright ? 'text-zinc-900' : 'text-white'}`}>
                                <Fingerprint size={14} className="text-accent" /> Windows Hello Biometrics
                            </span>
                            <p className={`text-[11px] font-mono ${isBright ? 'text-zinc-600' : 'text-white/70'}`}>Use fingerprint, facial recognition, or PIN.</p>
                        </div>
                        <button
                            type="button"
                            disabled={isTogglingBio}
                            onClick={handleToggleBiometrics}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition active:scale-95 cursor-pointer ${
                                biometricsEnabled
                                    ? (isBright ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30 hover:bg-emerald-500/25 font-bold' : 'bg-emerald-500/25 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/35 font-bold')
                                    : (isBright ? 'bg-black/[0.05] text-zinc-800 font-semibold border-black/10 hover:bg-black/[0.09]' : 'bg-white/10 text-white font-semibold border-white/15 hover:bg-white/15')
                            }`}
                        >
                            {isTogglingBio ? 'Updating...' : (biometricsEnabled ? 'Enabled' : 'Enable')}
                        </button>
                    </div>

                    {/* Master Password Settings */}
                    <form onSubmit={handleChangeMasterPassword} className={`p-3 border rounded-2xl flex flex-col gap-2.5 ${cardClass}`}>
                        <span className={`text-xs font-semibold ${isBright ? 'text-zinc-900' : 'text-white'}`}>Change Master Password</span>
                        <input
                            type="password"
                            required
                            placeholder="Current Master Password"
                            value={oldPassInput}
                            onChange={e => setOldPassInput(e.target.value)}
                            className={`h-9 border rounded-full px-3.5 text-xs outline-none transition-colors ${inputClass}`}
                        />
                        <input
                            type="password"
                            required
                            placeholder="New Master Password"
                            value={newMasterPass}
                            onChange={e => setNewMasterPass(e.target.value)}
                            className={`h-9 border rounded-full px-3.5 text-xs outline-none transition-colors ${inputClass}`}
                        />
                        <input
                            type="password"
                            required
                            placeholder="Confirm New Master Password"
                            value={confirmMasterPass}
                            onChange={e => setConfirmMasterPass(e.target.value)}
                            className={`h-9 border rounded-full px-3.5 text-xs outline-none transition-colors ${inputClass}`}
                        />
                        <button type="submit" disabled={isChangingPass} className="w-full h-9 mt-1 rounded-full bg-accent hover:brightness-110 active:scale-95 text-zinc-950 font-bold border border-accent/40 text-xs transition cursor-pointer shadow-xs">
                            {isChangingPass ? 'Updating...' : 'Update Master Password'}
                        </button>
                    </form>

                    {/* Vault Migration & Backups */}
                    <div className={`p-3 rounded-2xl flex flex-col gap-2.5 border ${cardClass}`}>
                        <div className="flex items-center justify-between">
                            <span className={`text-xs font-semibold flex items-center gap-1.5 ${isBright ? 'text-zinc-900' : 'text-white'}`}>
                                <UploadCloud size={13} className="text-accent" /> Vault Migration & Backups
                            </span>
                            <span className={`text-[10px] font-mono ${isBright ? 'text-zinc-500' : 'text-white/70'}`}>
                                Bitwarden • Proton Pass • Chrome
                            </span>
                        </div>
                        <p className={`text-[11px] leading-snug ${isBright ? 'text-zinc-600' : 'text-white/75'}`}>
                            Transition from external password managers by importing your CSV or JSON vault export directly into QVault.
                        </p>

                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImportFile}
                            accept=".csv,.json,text/csv,application/json"
                            className="hidden"
                        />

                        <div className="grid grid-cols-2 gap-2 mt-0.5">
                            <button
                                type="button"
                                disabled={isImporting}
                                onClick={() => fileInputRef.current?.click()}
                                className="h-9 rounded-full font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-40 border bg-accent hover:brightness-110 text-zinc-950 border-accent/40 shadow-xs"
                            >
                                {isImporting ? <RefreshCw size={12} className="animate-spin" /> : <UploadCloud size={12} />}
                                <span>{isImporting ? 'Importing...' : 'Import Vault'}</span>
                            </button>
                            <div className="flex gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => {
                                        exportVaultData('json');
                                        showToast('Exported QVault backup (.JSON)');
                                    }}
                                    className={`flex-1 h-9 rounded-full text-xs font-semibold flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer border ${isBright
                                            ? 'bg-black/[0.04] hover:bg-black/[0.08] text-zinc-800 border-black/10'
                                            : 'bg-white/10 hover:bg-white/15 text-white border-white/15'
                                        }`}
                                    title="Export backup as JSON"
                                >
                                    <Download size={11} /> .JSON
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        exportVaultData('csv');
                                        showToast('Exported QVault backup (.CSV)');
                                    }}
                                    className={`flex-1 h-9 rounded-full text-xs font-semibold flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer border ${isBright
                                            ? 'bg-black/[0.04] hover:bg-black/[0.08] text-zinc-800 border-black/10'
                                            : 'bg-white/10 hover:bg-white/15 text-white border-white/15'
                                        }`}
                                    title="Export backup as CSV"
                                >
                                    <Download size={11} /> .CSV
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Reset Local Vault Section */}
                    <div className={`p-3 rounded-2xl flex flex-col gap-2 border ${
                        isBright ? 'bg-red-500/[0.06] border-red-500/20' : 'bg-red-500/[0.07] border-red-500/25'
                    }`}>
                        <span className={`text-xs font-semibold flex items-center gap-1.5 ${isBright ? 'text-red-600' : 'text-red-400'}`}>
                            <Trash2 size={13} /> Reset Local Vault
                        </span>
                        <p className={`text-[11px] ${isBright ? 'text-zinc-600' : 'text-white/75'}`}>
                            Permanently wipe locally cached credentials on this device.
                        </p>
                        {confirmReset ? (
                            <div className="flex items-center gap-2 mt-1">
                                <button
                                    type="button"
                                    onClick={handleConfirmResetVault}
                                    className="flex-1 h-9 rounded-full bg-red-600 hover:bg-red-700 text-white font-semibold text-xs transition active:scale-95 cursor-pointer"
                                >
                                    Yes, Wipe Everything
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setConfirmReset(false)}
                                    className={`px-4 h-9 rounded-full text-xs font-semibold transition active:scale-95 cursor-pointer border ${
                                        isBright ? 'bg-black/[0.05] hover:bg-black/[0.09] text-zinc-800 border-black/10' : 'bg-white/10 hover:bg-white/15 text-white border-white/15'
                                    }`}
                                >
                                    Cancel
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setConfirmReset(true)}
                                className={`w-full h-9 mt-1 rounded-full border font-semibold text-xs transition active:scale-95 cursor-pointer ${
                                    isBright ? 'bg-red-500/10 hover:bg-red-500/20 border-red-500/25 text-red-600' : 'bg-red-500/15 hover:bg-red-500/25 border-red-500/30 text-red-400'
                                }`}
                            >
                                Reset Local Vault
                            </button>
                        )}
                    </div>
                </div>
            ) : viewMode === 'add' ? (
                /* ADD / EDIT ITEM VIEW */
                <form onSubmit={handleSaveNewItem} className={`flex flex-col gap-3 py-1 ${isExitingAdd ? 'animate-slide-out-right pointer-events-none' : 'animate-slide-in-right'}`}>

                    <div className={`flex justify-between items-center pb-2 border-b ${isBright ? 'border-black/[0.06]' : 'border-white/[0.08]'}`}>
                        <button type="button" onClick={handleCloseAdd} className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition active:scale-95 cursor-pointer ${
                            isBright ? 'text-zinc-700 hover:text-zinc-950 hover:bg-black/[0.04]' : 'text-white/85 hover:text-white hover:bg-white/[0.06]'
                        }`}>
                            <ArrowLeft size={13} /> Back
                        </button>
                        <span className={`text-xs font-semibold ${isBright ? 'text-zinc-900' : 'text-white'}`}>{editingItemId ? 'Edit Item' : 'New Vault Item'}</span>
                    </div>

                    {/* Type Selector (5 Types: login, totp, card, address, passkey) */}
                    <div onMouseLeave={() => setHoveredNewItemType(null)} className={`relative grid grid-cols-5 p-1 rounded-full border shadow-xs select-none ${isBright
                            ? 'bg-black/[0.03] border-black/[0.05]'
                            : 'bg-black/25 border-white/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.3)]'
                        }`}>
                        {/* Hover preview pill */}
                        {hoveredNewItemType && hoveredNewItemType !== newItemType && (
                            <div
                                className={`absolute top-1 bottom-1 w-[calc(20%-2px)] rounded-full transition-all duration-200 pointer-events-none ${
                                    isBright ? 'bg-black/[0.04]' : 'bg-white/[0.05]'
                                }`}
                                style={{
                                    left: 4,
                                    transform: hoveredNewItemType === 'login' ? 'translateX(0)' :
                                        hoveredNewItemType === 'totp' ? 'translateX(100%)' :
                                        hoveredNewItemType === 'card' ? 'translateX(200%)' :
                                        hoveredNewItemType === 'address' ? 'translateX(300%)' :
                                        'translateX(400%)'
                                }}
                            />
                        )}
                        <div
                            className={`absolute top-1 bottom-1 w-[calc(20%-2px)] rounded-full transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${isBright
                                    ? 'bg-white border border-black/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
                                    : 'border'
                                }`}
                            style={{
                                left: 4,
                                transform: newItemType === 'login' ? 'translateX(0)' :
                                    newItemType === 'totp' ? 'translateX(100%)' :
                                    newItemType === 'card' ? 'translateX(200%)' :
                                    newItemType === 'address' ? 'translateX(300%)' :
                                    'translateX(400%)',
                                ...(!isBright ? {
                                    borderColor: 'var(--accent, #d4bc94)',
                                    backgroundColor: 'rgba(212, 188, 148, 0.22)',
                                    boxShadow: '0 2px 10px rgba(212, 188, 148, 0.25), inset 0 1px 0 0 rgba(255, 255, 255, 0.25)'
                                } : {})
                            }}
                        />
                        <button type="button" onMouseEnter={() => setHoveredNewItemType('login')} onClick={() => setNewItemType('login')} className={`relative z-10 py-1.5 rounded-full text-[11px] font-semibold transition-all duration-300 active:scale-95 flex items-center justify-center gap-1 cursor-pointer truncate ${newItemType === 'login' ? (isBright ? 'text-zinc-950 font-bold' : 'text-sky-300 font-bold') : (isBright ? 'text-zinc-600 hover:text-zinc-950' : 'text-white/70 hover:text-white')}`}>
                            <Globe size={11} className={newItemType === 'login' ? (isBright ? 'text-sky-600' : 'text-sky-300') : (isBright ? 'text-zinc-500' : 'text-white/65')} /> Login
                        </button>
                        <button type="button" onMouseEnter={() => setHoveredNewItemType('totp')} onClick={() => setNewItemType('totp')} className={`relative z-10 py-1.5 rounded-full text-[11px] font-semibold transition-all duration-300 active:scale-95 flex items-center justify-center gap-1 cursor-pointer truncate ${newItemType === 'totp' ? (isBright ? 'text-zinc-950 font-bold' : 'text-emerald-300 font-bold') : (isBright ? 'text-zinc-600 hover:text-zinc-950' : 'text-white/70 hover:text-white')}`}>
                            <ShieldCheck size={11} className={newItemType === 'totp' ? (isBright ? 'text-emerald-600' : 'text-emerald-300') : (isBright ? 'text-zinc-500' : 'text-white/65')} /> 2FA
                        </button>
                        <button type="button" onMouseEnter={() => setHoveredNewItemType('card')} onClick={() => setNewItemType('card')} className={`relative z-10 py-1.5 rounded-full text-[11px] font-semibold transition-all duration-300 active:scale-95 flex items-center justify-center gap-1 cursor-pointer truncate ${newItemType === 'card' ? (isBright ? 'text-zinc-950 font-bold' : 'text-blue-300 font-bold') : (isBright ? 'text-zinc-600 hover:text-zinc-950' : 'text-white/70 hover:text-white')}`}>
                            <CreditCard size={11} className={newItemType === 'card' ? (isBright ? 'text-blue-600' : 'text-blue-300') : (isBright ? 'text-zinc-500' : 'text-white/65')} /> Card
                        </button>
                        <button type="button" onMouseEnter={() => setHoveredNewItemType('address')} onClick={() => setNewItemType('address')} className={`relative z-10 py-1.5 rounded-full text-[11px] font-semibold transition-all duration-300 active:scale-95 flex items-center justify-center gap-1 cursor-pointer truncate ${newItemType === 'address' ? (isBright ? 'text-zinc-950 font-bold' : 'text-amber-300 font-bold') : (isBright ? 'text-zinc-600 hover:text-zinc-950' : 'text-white/70 hover:text-white')}`}>
                            <MapPin size={11} className={newItemType === 'address' ? (isBright ? 'text-amber-600' : 'text-amber-300') : (isBright ? 'text-zinc-500' : 'text-white/65')} /> Address
                        </button>
                        <button type="button" onMouseEnter={() => setHoveredNewItemType('passkey')} onClick={() => setNewItemType('passkey')} className={`relative z-10 py-1.5 rounded-full text-[11px] font-semibold transition-all duration-300 active:scale-95 flex items-center justify-center gap-1 cursor-pointer truncate ${newItemType === 'passkey' ? (isBright ? 'text-zinc-950 font-bold' : 'text-purple-300 font-bold') : (isBright ? 'text-zinc-600 hover:text-zinc-950' : 'text-white/70 hover:text-white')}`}>
                            <Fingerprint size={11} className={newItemType === 'passkey' ? (isBright ? 'text-purple-600' : 'text-purple-300') : (isBright ? 'text-zinc-500' : 'text-white/65')} /> Passkey
                        </button>
                    </div>

                    <div className="flex flex-col gap-2.5 max-h-80 overflow-y-auto hide-scroll pr-1">
                        {/* Title / Label */}
                        <div className="flex flex-col gap-1">
                            <label className={labelClass}>
                                {newItemType === 'card' ? 'Card Nickname' : newItemType === 'address' ? 'Address Nickname' : newItemType === 'totp' ? 'Account / Service Title' : 'Title'}
                            </label>
                            <input
                                type="text"
                                required
                                placeholder={newItemType === 'card' ? 'e.g. Chase Sapphire' : newItemType === 'address' ? 'e.g. Home or Office' : newItemType === 'totp' ? 'e.g. GitHub or Google' : 'e.g. GitHub'}
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className={`h-8 border rounded-lg px-3 text-xs outline-none transition-colors ${inputClass}`}
                            />
                        </div>

                        {/* 2FA AUTHENTICATOR FIELDS */}
                        {newItemType === 'totp' && (
                            <>
                                <div className="flex flex-col gap-1">
                                    <label className={labelClass}>Username / Email / Issuer (Optional)</label>
                                    <input
                                        type="text"
                                        placeholder="user@domain.com"
                                        value={username}
                                        onChange={e => setUsername(e.target.value)}
                                        className={`h-8 border rounded-lg px-3 text-xs outline-none transition-colors ${inputClass}`}
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <div className="flex justify-between items-center">
                                        <label className={labelClass}>2FA Secret / Authenticator Key</label>
                                        {totpSecret && (
                                            <button
                                                type="button"
                                                onClick={() => setTotpSecret('')}
                                                className={`text-[10px] font-mono transition cursor-pointer ${isBright ? 'text-zinc-500 hover:text-zinc-800' : 'text-white/60 hover:text-white'}`}
                                            >
                                                Clear
                                            </button>
                                        )}
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. JBSWY3DPEHPK3PXP or otpauth://..."
                                        value={totpSecret}
                                        onChange={e => handleTotpSecretChange(e.target.value)}
                                        className={`h-8 border rounded-lg px-3 text-xs font-mono outline-none transition-colors ${inputClass}`}
                                    />
                                </div>
                                {previewTotpCode && (
                                    <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
                                        isBright ? 'bg-emerald-500/[0.08] border-emerald-500/25 text-emerald-950' : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200'
                                    }`}>
                                        <div className="flex items-center gap-2.5">
                                            <CountdownRing remaining={totpRemaining} size={24} strokeWidth={2.5} />
                                            <div className="flex flex-col">
                                                <span className="text-[10px] uppercase font-mono font-bold tracking-wider opacity-75">
                                                    Live Code Preview
                                                </span>
                                                <span className="font-mono text-sm font-bold tracking-widest">
                                                    {formatTotpCode(previewTotpCode)}
                                                </span>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-mono opacity-80">
                                            {totpRemaining}s left
                                        </span>
                                    </div>
                                )}
                            </>
                        )}

                        {/* LOGIN FIELDS */}
                        {newItemType === 'login' && (
                            <>
                                <div className="flex flex-col gap-1">
                                    <label className={labelClass}>Website URL</label>
                                    <input
                                        type="text"
                                        placeholder="https://example.com"
                                        value={url}
                                        onChange={e => setUrl(e.target.value)}
                                        className={`h-8 border rounded-lg px-3 text-xs outline-none transition-colors ${inputClass}`}
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className={labelClass}>Username / Email</label>
                                    <input
                                        type="text"
                                        placeholder="user@domain.com"
                                        value={username}
                                        onChange={e => setUsername(e.target.value)}
                                        className={`h-8 border rounded-lg px-3 text-xs outline-none transition-colors ${inputClass}`}
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <div className="flex justify-between items-center">
                                        <label className={labelClass}>Password</label>
                                        <button type="button" onClick={() => { generateCustomPassword(); setPassword(generatedResult); showToast('Generated password!'); }} className={`text-[10px] hover:brightness-110 font-mono font-semibold transition cursor-pointer ${isBright ? 'text-amber-700' : 'text-accent'}`}>
                                            Generate Random
                                        </button>
                                    </div>
                                    <div className="relative flex items-center">
                                        <input
                                            type={showNewItemPassword ? "text" : "password"}
                                            required
                                            placeholder="Password"
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            className={`w-full h-8 border rounded-lg pl-3 pr-8 text-xs font-mono outline-none transition-colors ${inputClass}`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNewItemPassword(prev => !prev)}
                                            className={`absolute right-2 p-1 rounded transition cursor-pointer ${
                                                isBright ? 'text-zinc-400 hover:text-zinc-700' : 'text-white/40 hover:text-white/80'
                                            }`}
                                            title={showNewItemPassword ? "Hide password" : "Show password"}
                                            tabIndex={-1}
                                        >
                                            {showNewItemPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                                        </button>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <div className="flex justify-between items-center">
                                        <label className={labelClass}>2FA Secret / Authenticator Key (Optional)</label>
                                        {totpSecret && (
                                            <button
                                                type="button"
                                                onClick={() => setTotpSecret('')}
                                                className={`text-[10px] font-mono transition cursor-pointer ${isBright ? 'text-zinc-500 hover:text-zinc-800' : 'text-white/60 hover:text-white'}`}
                                            >
                                                Clear
                                            </button>
                                        )}
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="e.g. JBSWY3DPEHPK3PXP or otpauth://..."
                                        value={totpSecret}
                                        onChange={e => handleTotpSecretChange(e.target.value)}
                                        className={`h-8 border rounded-lg px-3 text-xs font-mono outline-none transition-colors ${inputClass}`}
                                    />
                                </div>
                                {previewTotpCode && (
                                    <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
                                        isBright ? 'bg-emerald-500/[0.08] border-emerald-500/25 text-emerald-950' : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200'
                                    }`}>
                                        <div className="flex items-center gap-2.5">
                                            <CountdownRing remaining={totpRemaining} size={24} strokeWidth={2.5} />
                                            <div className="flex flex-col">
                                                <span className="text-[10px] uppercase font-mono font-bold tracking-wider opacity-75">
                                                    Live Code Preview
                                                </span>
                                                <span className="font-mono text-sm font-bold tracking-widest">
                                                    {formatTotpCode(previewTotpCode)}
                                                </span>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-mono opacity-80">
                                            {totpRemaining}s left
                                        </span>
                                    </div>
                                )}
                            </>
                        )}

                        {/* CREDIT CARD FIELDS */}
                        {newItemType === 'card' && (
                            <>
                                <div className="flex flex-col gap-1">
                                    <label className={labelClass}>Cardholder Name</label>
                                    <input
                                        type="text"
                                        placeholder="Name on card"
                                        value={cardholderName}
                                        onChange={e => setCardholderName(e.target.value)}
                                        className={`h-8 border rounded-lg px-3 text-xs outline-none transition-colors ${inputClass}`}
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <div className="flex justify-between items-center">
                                        <label className={labelClass}>Card Number</label>
                                        <span className={`text-[10px] font-mono font-semibold ${isBright ? 'text-amber-700' : 'text-accent'}`}>{cardBrand}</span>
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        maxLength={19}
                                        placeholder="4532 •••• •••• ••••"
                                        value={cardNumber}
                                        onChange={e => {
                                            const formatted = formatCardNumberInput(e.target.value);
                                            setCardNumber(formatted);
                                            setCardBrand(detectCardBrand(formatted));
                                        }}
                                        className={`h-8 border rounded-lg px-3 text-xs font-mono tracking-wider outline-none transition-colors ${inputClass}`}
                                    />
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="flex flex-col gap-1">
                                        <label className={labelClass}>Exp Month</label>
                                        <input
                                            type="text"
                                            maxLength={2}
                                            placeholder="MM"
                                            value={cardExpMonth}
                                            onChange={e => setCardExpMonth(e.target.value.replace(/\D/g, ''))}
                                            className={`h-8 border rounded-lg px-2 text-xs text-center font-mono outline-none transition-colors ${inputClass}`}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className={labelClass}>Exp Year</label>
                                        <input
                                            type="text"
                                            maxLength={4}
                                            placeholder="YYYY"
                                            value={cardExpYear}
                                            onChange={e => setCardExpYear(e.target.value.replace(/\D/g, ''))}
                                            className={`h-8 border rounded-lg px-2 text-xs text-center font-mono outline-none transition-colors ${inputClass}`}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className={labelClass}>CVV</label>
                                        <input
                                            type="password"
                                            maxLength={4}
                                            placeholder="•••"
                                            value={cardCvv}
                                            onChange={e => setCardCvv(e.target.value.replace(/\D/g, ''))}
                                            className={`h-8 border rounded-lg px-2 text-xs text-center font-mono outline-none transition-colors ${inputClass}`}
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {/* ADDRESS FIELDS */}
                        {newItemType === 'address' && (
                            <>
                                <div className="flex flex-col gap-1">
                                    <label className={labelClass}>Full Name</label>
                                    <input
                                        type="text"
                                        placeholder="Full recipient name"
                                        value={fullName}
                                        onChange={e => setFullName(e.target.value)}
                                        className={`h-8 border rounded-lg px-3 text-xs outline-none transition-colors ${inputClass}`}
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className={labelClass}>Street Address</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Street name and number"
                                        value={streetAddress}
                                        onChange={e => setStreetAddress(e.target.value)}
                                        className={`h-8 border rounded-lg px-3 text-xs outline-none transition-colors ${inputClass}`}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="flex flex-col gap-1">
                                        <label className={labelClass}>Apt / Suite</label>
                                        <input
                                            type="text"
                                            placeholder="Apt 4B"
                                            value={unit}
                                            onChange={e => setUnit(e.target.value)}
                                            className={`h-8 border rounded-lg px-3 text-xs outline-none transition-colors ${inputClass}`}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className={labelClass}>City</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="City"
                                            value={city}
                                            onChange={e => setCity(e.target.value)}
                                            className={`h-8 border rounded-lg px-3 text-xs outline-none transition-colors ${inputClass}`}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="flex flex-col gap-1">
                                        <label className={labelClass}>State / Province</label>
                                        <input
                                            type="text"
                                            placeholder="State or Region"
                                            value={stateProvince}
                                            onChange={e => setStateProvince(e.target.value)}
                                            className={`h-8 border rounded-lg px-3 text-xs outline-none transition-colors ${inputClass}`}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className={labelClass}>ZIP / Postal Code</label>
                                        <input
                                            type="text"
                                            placeholder="Postal code"
                                            value={postalCode}
                                            onChange={e => setPostalCode(e.target.value)}
                                            className={`h-8 border rounded-lg px-3 text-xs outline-none transition-colors ${inputClass}`}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="flex flex-col gap-1">
                                        <label className={labelClass}>Phone Number</label>
                                        <input
                                            type="text"
                                            placeholder="+1 (555) 000-0000"
                                            value={phone}
                                            onChange={e => setPhone(e.target.value)}
                                            className={`h-8 border rounded-lg px-3 text-xs outline-none transition-colors ${inputClass}`}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className={labelClass}>Email</label>
                                        <input
                                            type="email"
                                            placeholder="email@domain.com"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            className={`h-8 border rounded-lg px-3 text-xs outline-none transition-colors ${inputClass}`}
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {/* PASSKEY FIELDS */}
                        {newItemType === 'passkey' && (
                            <>
                                <div className="flex flex-col gap-1">
                                    <label className={labelClass}>Domain / RP ID</label>
                                    <input
                                        type="text"
                                        placeholder="github.com"
                                        value={passkeyRpId}
                                        onChange={e => setPasskeyRpId(e.target.value)}
                                        className={`h-8 border rounded-lg px-3 text-xs outline-none transition-colors ${inputClass}`}
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className={labelClass}>Username / Account</label>
                                    <input
                                        type="text"
                                        placeholder="user@domain.com"
                                        value={username}
                                        onChange={e => setUsername(e.target.value)}
                                        className={`h-8 border rounded-lg px-3 text-xs outline-none transition-colors ${inputClass}`}
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    <div className={`flex gap-2 mt-2 pt-2 border-t ${isBright ? 'border-black/[0.06]' : 'border-white/[0.08]'}`}>
                        <button type="button" onClick={() => setViewMode('vault')} className={`flex-1 h-9 rounded-full border text-xs font-semibold transition active:scale-95 cursor-pointer ${
                            isBright ? 'bg-black/[0.04] hover:bg-black/[0.08] border-black/10 text-zinc-700 hover:text-zinc-950' : 'bg-white/[0.07] hover:bg-white/[0.12] border-white/10 text-white/85 hover:text-white'
                        }`}>
                            Cancel
                        </button>
                        <button type="submit" disabled={isSaving} className="flex-1 h-9 rounded-full bg-accent hover:brightness-110 active:scale-95 text-zinc-950 font-bold border border-accent/40 text-xs transition cursor-pointer shadow-xs">
                            {isSaving ? 'Saving...' : 'Save to Vault'}
                        </button>
                    </div>
                </form>
            ) : (
                /* UNLOCKED MAIN VAULT VIEW */
                <div className="flex flex-col gap-3">
                    {/* Top Segmented Control (100% width, 4 distinct pages, zero emojis) */}
                    <div
                        onMouseLeave={() => setHoveredActivePage(null)}
                        className={`relative grid grid-cols-4 p-1 rounded-full border shadow-xs select-none ${
                            isBright
                                ? 'bg-black/[0.03] border-black/[0.05]'
                                : 'bg-black/25 border-white/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.3)]'
                        }`}
                    >
                        {/* Hover preview pill */}
                        {hoveredActivePage && hoveredActivePage !== activePage && (
                            <div
                                className={`absolute top-1 bottom-1 w-[calc(25%-2px)] rounded-full transition-all duration-200 pointer-events-none ${
                                    isBright ? 'bg-black/[0.04]' : 'bg-white/[0.05]'
                                }`}
                                style={{
                                    left: 4,
                                    transform: hoveredActivePage === 'logins' ? 'translateX(0)' :
                                        hoveredActivePage === '2fa' ? 'translateX(100%)' :
                                        hoveredActivePage === 'wallet' ? 'translateX(200%)' :
                                        'translateX(300%)'
                                }}
                            />
                        )}

                        {/* Animated sliding indicator pill */}
                        <div
                            className={`absolute top-1 bottom-1 w-[calc(25%-2px)] rounded-full transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] pointer-events-none ${
                                isBright
                                    ? 'bg-white border border-black/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
                                    : 'border'
                            }`}
                            style={{
                                left: 4,
                                transform: activePage === 'logins' ? 'translateX(0)' :
                                    activePage === '2fa' ? 'translateX(100%)' :
                                    activePage === 'wallet' ? 'translateX(200%)' :
                                    'translateX(300%)',
                                ...(!isBright ? {
                                    borderColor: 'var(--accent, #d4bc94)',
                                    backgroundColor: 'rgba(212, 188, 148, 0.22)',
                                    boxShadow: '0 2px 10px rgba(212, 188, 148, 0.25), inset 0 1px 0 0 rgba(255, 255, 255, 0.25)'
                                } : {})
                            }}
                        />

                        {/* Page 1: Logins */}
                        <button
                            type="button"
                            onMouseEnter={() => setHoveredActivePage('logins')}
                            onClick={() => setActivePage('logins')}
                            className={`relative z-10 py-1.5 rounded-full text-[11px] font-semibold transition-all duration-300 active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                                activePage === 'logins'
                                    ? (isBright ? 'text-zinc-950 font-bold' : 'text-sky-300 font-bold')
                                    : (isBright ? 'text-zinc-600 hover:text-zinc-950' : 'text-white/70 hover:text-white')
                            }`}
                        >
                            <KeyRound size={11} className={activePage === 'logins' ? (isBright ? 'text-sky-700' : 'text-sky-300') : (isBright ? 'text-zinc-500' : 'text-white/60')} />
                            <span>Logins</span>
                            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold leading-none ${
                                activePage === 'logins'
                                    ? (isBright ? 'bg-sky-500/20 text-sky-950' : 'bg-sky-400/25 text-sky-200')
                                    : (isBright ? 'bg-black/5 text-zinc-600' : 'bg-white/10 text-white/60')
                            }`}>
                                {loginsCount}
                            </span>
                        </button>

                        {/* Page 2: 2FA */}
                        <button
                            type="button"
                            onMouseEnter={() => setHoveredActivePage('2fa')}
                            onClick={() => setActivePage('2fa')}
                            className={`relative z-10 py-1.5 rounded-full text-[11px] font-semibold transition-all duration-300 active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                                activePage === '2fa'
                                    ? (isBright ? 'text-zinc-950 font-bold' : 'text-emerald-300 font-bold')
                                    : (isBright ? 'text-zinc-600 hover:text-zinc-950' : 'text-white/70 hover:text-white')
                            }`}
                        >
                            <ShieldCheck size={11} className={activePage === '2fa' ? (isBright ? 'text-emerald-700' : 'text-emerald-300') : (isBright ? 'text-zinc-500' : 'text-white/60')} />
                            <span>2FA</span>
                            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold leading-none ${
                                activePage === '2fa'
                                    ? (isBright ? 'bg-emerald-500/20 text-emerald-950' : 'bg-emerald-400/25 text-emerald-200')
                                    : (isBright ? 'bg-black/5 text-zinc-600' : 'bg-white/10 text-white/60')
                            }`}>
                                {totpItems.length}
                            </span>
                        </button>

                        {/* Page 3: Wallet */}
                        <button
                            type="button"
                            onMouseEnter={() => setHoveredActivePage('wallet')}
                            onClick={() => setActivePage('wallet')}
                            className={`relative z-10 py-1.5 rounded-full text-[11px] font-semibold transition-all duration-300 active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                                activePage === 'wallet'
                                    ? (isBright ? 'text-zinc-950 font-bold' : 'text-blue-300 font-bold')
                                    : (isBright ? 'text-zinc-600 hover:text-zinc-950' : 'text-white/70 hover:text-white')
                            }`}
                        >
                            <CreditCard size={11} className={activePage === 'wallet' ? (isBright ? 'text-blue-700' : 'text-blue-300') : (isBright ? 'text-zinc-500' : 'text-white/60')} />
                            <span>Wallet</span>
                            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold leading-none ${
                                activePage === 'wallet'
                                    ? (isBright ? 'bg-blue-500/20 text-blue-950' : 'bg-blue-400/25 text-blue-200')
                                    : (isBright ? 'bg-black/5 text-zinc-600' : 'bg-white/10 text-white/60')
                            }`}>
                                {walletItems.length}
                            </span>
                        </button>

                        {/* Page 4: Generator */}
                        <button
                            type="button"
                            onMouseEnter={() => setHoveredActivePage('generator')}
                            onClick={() => setActivePage('generator')}
                            className={`relative z-10 py-1.5 rounded-full text-[11px] font-semibold transition-all duration-300 active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                                activePage === 'generator'
                                    ? (isBright ? 'text-zinc-950 font-bold' : 'text-amber-300 font-bold')
                                    : (isBright ? 'text-zinc-600 hover:text-zinc-950' : 'text-white/70 hover:text-white')
                            }`}
                        >
                            <Sparkles size={11} className={activePage === 'generator' ? (isBright ? 'text-amber-700' : 'text-amber-300') : (isBright ? 'text-zinc-500' : 'text-white/60')} />
                            <span>Generator</span>
                        </button>
                    </div>

                    {activePage === 'generator' ? (
                        /* GENERATOR TAB */
                        <div className="flex flex-col gap-3 py-1 animate-slide-down-fade">
                            <div className={`p-3 border rounded-2xl flex flex-col gap-1.5 relative ${cardClass}`}>
                                <span className={`text-[10px] font-mono uppercase tracking-wider font-bold ${isBright ? 'text-emerald-700' : 'text-emerald-400'}`}>Generated Password</span>
                                <div className={`flex items-center justify-between font-mono text-sm font-bold break-all select-all tracking-wider ${isBright ? 'text-zinc-900' : 'text-white'}`}>
                                    <span>{generatedResult}</span>
                                    <button onClick={() => copyToClipboard(generatedResult, 'generated password', 'gen')} className={`w-7 h-7 rounded-full flex items-center justify-center transition shrink-0 ml-2 border cursor-pointer active:scale-95 ${
                                        isBright
                                            ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 border-emerald-500/30'
                                            : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/30'
                                    }`} title="Copy">
                                        <Copy size={13} />
                                    </button>
                                </div>
                            </div>

                            <div className={`flex flex-col gap-2.5 p-3 border rounded-2xl ${cardClass}`}>
                                <div className="flex justify-between items-center">
                                    <span className={`text-xs font-mono font-medium ${isBright ? 'text-zinc-900' : 'text-white'}`}>Length: {genLength}</span>
                                    <input
                                        type="range"
                                        min={8}
                                        max={32}
                                        value={genLength}
                                        onChange={e => setGenLength(Number(e.target.value))}
                                        className="w-28 accent-accent cursor-pointer"
                                    />
                                </div>

                                <div className={`grid grid-cols-2 gap-2 text-xs font-mono pt-2 border-t ${isBright ? 'text-zinc-700 border-black/[0.06]' : 'text-white/85 border-white/[0.08]'}`}>
                                    <label className={`flex items-center gap-2 cursor-pointer ${isBright ? 'hover:text-zinc-950' : 'hover:text-white'}`}>
                                        <input type="checkbox" checked={useUpper} onChange={e => setUseUpper(e.target.checked)} className="rounded accent-accent" /> A-Z (Upper)
                                    </label>
                                    <label className={`flex items-center gap-2 cursor-pointer ${isBright ? 'hover:text-zinc-950' : 'hover:text-white'}`}>
                                        <input type="checkbox" checked={useLower} onChange={e => setUseLower(e.target.checked)} className="rounded accent-accent" /> a-z (Lower)
                                    </label>
                                    <label className={`flex items-center gap-2 cursor-pointer ${isBright ? 'hover:text-zinc-950' : 'hover:text-white'}`}>
                                        <input type="checkbox" checked={useNumbers} onChange={e => setUseNumbers(e.target.checked)} className="rounded accent-accent" /> 0-9 (Numbers)
                                    </label>
                                    <label className={`flex items-center gap-2 cursor-pointer ${isBright ? 'hover:text-zinc-950' : 'hover:text-white'}`}>
                                        <input type="checkbox" checked={useSymbols} onChange={e => setUseSymbols(e.target.checked)} className="rounded accent-accent" /> !@#$ (Symbols)
                                    </label>
                                </div>
                            </div>
                        </div>
                    ) : activePage === '2fa' ? (
                        /* DEDICATED 2FA CODES PAGE */
                        <div className="flex flex-col gap-2.5 animate-slide-down-fade">
                            {/* Search bar */}
                            <div className="relative shrink-0">
                                <Search size={13} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${isBright ? 'text-zinc-400' : 'text-white/60'}`} />
                                <input
                                    type="text"
                                    placeholder="Search 2FA authenticator codes..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className={`w-full h-9 pl-9 pr-4 rounded-full text-xs outline-none font-mono border transition-colors ${inputClass}`}
                                />
                            </div>

                            {/* 2FA Items List */}
                            <div className="flex flex-col gap-2 max-h-[380px] overflow-y-auto hide-scroll pr-0.5">
                                {currentTabFilteredItems.length === 0 ? (
                                    <div className={`text-center text-xs py-8 font-mono flex flex-col items-center gap-2.5 ${isBright ? 'text-zinc-500' : 'text-white/70'}`}>
                                        <span>{searchQuery ? 'No matching 2FA codes.' : 'No two-factor authenticators stored.'}</span>
                                        {!searchQuery && (
                                            <button
                                                onClick={() => handleOpenAddForm('totp')}
                                                className="px-4 py-2 rounded-full border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer active:scale-95 bg-accent hover:brightness-110 text-zinc-950 border-accent/40 shadow-xs"
                                            >
                                                <Plus size={12} strokeWidth={2.5} /> Add 2FA Code
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    currentTabFilteredItems.map((item, index) => {
                                        const secret = item.totpSecret || (item.itemType === 'totp' ? item.password : null) || (isValidTotpSecret(item.password) ? item.password : null);
                                        const code = secret ? generateTotpCode(secret, now) : null;

                                        return (
                                            <div
                                                key={item.id}
                                                style={{ animationDelay: `${Math.min(index, 10) * 35}ms` }}
                                                className={`p-3 rounded-2xl flex flex-col gap-2.5 shrink-0 min-h-[96px] transition-all group border animate-tile-in hover:-translate-y-0.5 hover:shadow-md ${
                                                    deletingIds.has(item.id) ? 'animate-row-collapse pointer-events-none' : ''
                                                } ${
                                                    isBright
                                                        ? 'bg-black/[0.035] hover:bg-black/[0.06] border-black/[0.08] hover:border-black/[0.15] shadow-xs'
                                                        : 'bg-black/25 hover:bg-black/35 border-white/[0.08] hover:border-white/[0.14]'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border shrink-0 transition-colors ${
                                                            isBright ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                                        }`}>
                                                            <ShieldCheck size={14} />
                                                        </div>
                                                        <div className="flex flex-col min-w-0 flex-1 justify-center gap-0.5">
                                                            <span className={`text-xs font-semibold truncate leading-snug ${isBright ? 'text-zinc-900' : 'text-white'}`}>
                                                                {item.title}
                                                            </span>
                                                            <span className={`text-[11px] truncate font-mono leading-snug ${isBright ? 'text-zinc-500' : 'text-white/70'}`}>
                                                                {item.username || item.url?.replace(/^https?:\/\//, '') || 'Authenticator'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => handleOpenEditForm(item)}
                                                            className={`w-6 h-6 rounded-full flex items-center justify-center transition active:scale-95 cursor-pointer ${
                                                                isBright ? 'hover:bg-black/[0.06] text-zinc-500 hover:text-zinc-900' : 'hover:bg-white/[0.10] text-white/70 hover:text-white'
                                                            }`}
                                                            title="Edit 2FA Item"
                                                        >
                                                            <Pencil size={12} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteItem(item.id, item.title)}
                                                            className={`w-6 h-6 rounded-full flex items-center justify-center transition active:scale-95 cursor-pointer ${
                                                                isBright ? 'hover:bg-red-500/10 text-zinc-500 hover:text-red-600' : 'hover:bg-red-500/25 text-white/70 hover:text-red-400'
                                                            }`}
                                                            title="Delete 2FA Item"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Live 6-digit TOTP code row */}
                                                <div className={`flex items-center justify-between px-3 py-2 rounded-xl border ${
                                                    isBright ? 'bg-black/[0.025] border-black/5 text-zinc-900' : 'bg-white/[0.04] border-white/[0.06] text-white'
                                                }`}>
                                                    <div className="flex items-center gap-3">
                                                        <CountdownRing remaining={totpRemaining} size={28} strokeWidth={2.5} />
                                                        {code ? (
                                                            <span className={`font-mono text-base font-bold tracking-widest select-all ${
                                                                isBright ? 'text-zinc-950 font-extrabold' : 'text-white'
                                                            }`}>
                                                                {formatTotpCode(code)}
                                                            </span>
                                                        ) : (
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs text-amber-400 font-mono font-medium">Setup Key Needed</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleOpenEditForm(item)}
                                                                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border transition active:scale-95 cursor-pointer ${
                                                                        isBright
                                                                            ? 'bg-amber-500/15 text-amber-900 border-amber-500/30 hover:bg-amber-500/25'
                                                                            : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                                                                    }`}
                                                                    title="Add 2FA Secret Key"
                                                                >
                                                                    Edit
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (code) {
                                                                copyToClipboard(code, '2FA code', item.id);
                                                            } else {
                                                                handleOpenEditForm(item);
                                                            }
                                                        }}
                                                        className={`px-3 py-1.5 rounded-full border text-[11px] font-semibold flex items-center gap-1.5 transition active:scale-95 cursor-pointer ${
                                                            copiedId === `2FA code-${item.id}`
                                                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 font-bold'
                                                                : isBright
                                                                    ? 'bg-black/[0.04] hover:bg-black/[0.08] text-zinc-800 border-black/10'
                                                                    : 'bg-white/[0.08] hover:bg-white/[0.14] text-white border-white/10'
                                                        }`}
                                                        title={code ? "Copy 6-digit code" : "Configure 2FA key"}
                                                    >
                                                        {copiedId === `2FA code-${item.id}` ? (
                                                            <>
                                                                <Check size={12} className="text-emerald-500" />
                                                                <span>Copied</span>
                                                            </>
                                                        ) : code ? (
                                                            <>
                                                                <Copy size={12} />
                                                                <span>Copy</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Pencil size={12} />
                                                                <span>Set Key</span>
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    ) : (
                        /* LOGINS OR WALLET LIST VIEW */
                        <div className="flex flex-col gap-2.5 animate-slide-down-fade">
                            {/* Saved for this website section (sleek single-row banner on logins page) */}
                            {activePage === 'logins' && currentDomain && matchingSiteItems.length > 0 && (
                                <div className={`p-2 px-3 rounded-2xl flex items-center justify-between gap-2.5 animate-slide-down-fade border shrink-0 ${
                                    isBright ? 'bg-accent/[0.12] border-accent/35 shadow-xs' : 'bg-accent/[0.08] border-accent/30'
                                }`}>
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="relative flex h-2 w-2 shrink-0">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                        </span>
                                        <div className="flex items-center gap-1.5 min-w-0 truncate">
                                            <span className={`text-xs font-semibold truncate ${isBright ? 'text-zinc-950 font-bold' : 'text-white'}`}>
                                                {matchingSiteItems[0].title}
                                            </span>
                                            <span className={`text-[10px] font-mono truncate shrink-0 ${isBright ? 'text-zinc-600' : 'text-white/65'}`}>
                                                ({matchingSiteItems.length} saved for {currentDomain})
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleAutofillPage(matchingSiteItems[0])}
                                        className="px-3 py-1 rounded-full bg-accent hover:brightness-110 active:scale-95 text-zinc-950 font-bold border border-accent/40 text-[11px] flex items-center gap-1 transition shrink-0 cursor-pointer shadow-xs"
                                        title={`Autofill ${matchingSiteItems[0].title}`}
                                    >
                                        <Zap size={11} strokeWidth={2.5} /> Autofill
                                    </button>
                                </div>
                            )}

                            {/* Search bar */}
                            <div className="relative shrink-0">
                                <Search size={13} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${isBright ? 'text-zinc-400' : 'text-white/60'}`} />
                                <input
                                    type="text"
                                    placeholder={activePage === 'logins' ? "Search logins & passkeys..." : "Search cards & addresses..."}
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className={`w-full h-9 pl-9 pr-4 rounded-full text-xs outline-none font-mono border transition-colors ${inputClass}`}
                                />
                            </div>

                            {/* Sub-filter micro-pills for Logins tab */}
                            {activePage === 'logins' && (
                                <div className={`flex items-center gap-1.5 p-1 rounded-2xl border mb-0.5 select-none shrink-0 ${
                                    isBright ? 'bg-black/[0.025] border-black/[0.06]' : 'bg-black/20 border-white/[0.06]'
                                }`}>
                                    <button
                                        type="button"
                                        onClick={() => setLoginSubFilter('all')}
                                        className={`flex-1 py-1 px-2 rounded-xl text-[10px] font-semibold transition active:scale-95 cursor-pointer flex items-center justify-center gap-1 ${
                                            loginSubFilter === 'all'
                                                ? (isBright ? 'bg-white text-zinc-950 font-bold shadow-xs border border-black/10' : 'bg-white/15 text-white font-bold shadow-xs border border-white/20')
                                                : (isBright ? 'text-zinc-600 hover:text-zinc-950' : 'text-white/60 hover:text-white')
                                        }`}
                                    >
                                        <span>All</span>
                                        <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono ${
                                            loginSubFilter === 'all' ? (isBright ? 'bg-black/10 text-zinc-900 font-bold' : 'bg-white/20 text-white font-bold') : (isBright ? 'bg-black/5 text-zinc-500' : 'bg-white/10 text-white/50')
                                        }`}>
                                            {loginsCount}
                                        </span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setLoginSubFilter('passwords')}
                                        className={`flex-1 py-1 px-2 rounded-xl text-[10px] font-semibold transition active:scale-95 cursor-pointer flex items-center justify-center gap-1 ${
                                            loginSubFilter === 'passwords'
                                                ? (isBright ? 'bg-white text-zinc-950 font-bold shadow-xs border border-black/10' : 'bg-white/15 text-white font-bold shadow-xs border border-white/20')
                                                : (isBright ? 'text-zinc-600 hover:text-zinc-950' : 'text-white/60 hover:text-white')
                                        }`}
                                    >
                                        <KeyRound size={10} className={loginSubFilter === 'passwords' ? (isBright ? 'text-sky-700' : 'text-sky-300') : (isBright ? 'text-zinc-500' : 'text-white/50')} />
                                        <span>Passwords</span>
                                        <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono ${
                                            loginSubFilter === 'passwords' ? (isBright ? 'bg-black/10 text-zinc-900 font-bold' : 'bg-white/20 text-white font-bold') : (isBright ? 'bg-black/5 text-zinc-500' : 'bg-white/10 text-white/50')
                                        }`}>
                                            {passwordsCount}
                                        </span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setLoginSubFilter('passkeys')}
                                        className={`flex-1 py-1 px-2 rounded-xl text-[10px] font-semibold transition active:scale-95 cursor-pointer flex items-center justify-center gap-1 ${
                                            loginSubFilter === 'passkeys'
                                                ? (isBright ? 'bg-white text-zinc-950 font-bold shadow-xs border border-black/10' : 'bg-white/15 text-white font-bold shadow-xs border border-white/20')
                                                : (isBright ? 'text-zinc-600 hover:text-zinc-950' : 'text-white/60 hover:text-white')
                                        }`}
                                    >
                                        <Fingerprint size={10} className={loginSubFilter === 'passkeys' ? (isBright ? 'text-purple-700' : 'text-purple-300') : (isBright ? 'text-zinc-500' : 'text-white/50')} />
                                        <span>Passkeys</span>
                                        <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono ${
                                            loginSubFilter === 'passkeys' ? (isBright ? 'bg-black/10 text-zinc-900 font-bold' : 'bg-white/20 text-white font-bold') : (isBright ? 'bg-black/5 text-zinc-500' : 'bg-white/10 text-white/50')
                                        }`}>
                                            {passkeysCount}
                                        </span>
                                    </button>
                                </div>
                            )}

                            {/* Items List */}
                            <div
                                key={`${activePage}-${loginSubFilter}`}
                                className="flex flex-col gap-2 max-h-[380px] overflow-y-auto hide-scroll pr-1"
                            >
                                {currentTabFilteredItems.length === 0 ? (
                                    <div className={`text-center text-xs py-8 font-mono flex flex-col items-center gap-2.5 ${isBright ? 'text-zinc-500' : 'text-white/70'}`}>
                                        <span>
                                            {searchQuery
                                                ? 'No matching vault items.'
                                                : activePage === 'logins'
                                                    ? (loginSubFilter === 'passwords' ? 'No passwords saved.' : loginSubFilter === 'passkeys' ? 'No passkeys saved.' : (passwords.length === 0 ? 'Your vault is currently empty.' : 'No logins or passkeys saved.'))
                                                    : (passwords.length === 0 ? 'Your vault is currently empty.' : 'No cards or addresses saved.')
                                            }
                                        </span>
                                        {!searchQuery && passwords.length === 0 && (
                                            <button
                                                type="button"
                                                onClick={() => setViewMode('settings')}
                                                className={`px-4 py-2 rounded-full border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer active:scale-95 ${isBright
                                                        ? 'bg-accent/20 hover:bg-accent/30 text-zinc-950 border-accent/40 shadow-xs'
                                                        : 'bg-accent hover:brightness-110 text-zinc-950 border-accent/40 shadow-xs'
                                                    }`}
                                            >
                                                <UploadCloud size={12} /> Import from Bitwarden or Proton Pass
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    currentTabFilteredItems.map((item, index) => {
                                        const isRevealed = revealedPasswords[item.id];
                                        const isCard = item.itemType === 'card';
                                        const isAddress = item.itemType === 'address';
                                        const isPasskey = item.itemType === 'passkey';
                                        const isLogin = !isCard && !isAddress && !isPasskey;
                                        const isExpanded = expandedItemIds.has(item.id);
                                        const inlineTotpSecret = item.totpSecret || (item.itemType === 'totp' ? item.password : null);
                                        const inlineTotpCode = inlineTotpSecret ? generateTotpCode(inlineTotpSecret, now) : null;

                                        const itemHost = item.url || item.passkeyData?.rpId || item.title || '';
                                        const isSiteMatch = currentDomain ? domainsMatch(currentDomain, itemHost) : false;

                                        // Subtitle calculation
                                        const subtitle = isCard
                                            ? (item.cardData?.cardNumber ? `•••• ${item.cardData.cardNumber.slice(-4)}` : (item.cardData?.cardholderName || 'Payment Card'))
                                            : isAddress
                                                ? (item.addressData?.fullName || [item.addressData?.city, item.addressData?.country].filter(Boolean).join(', ') || 'Address')
                                                : isPasskey
                                                    ? (item.passkeyData?.rpId || item.url || 'WebAuthn Passkey')
                                                    : (item.username || item.url || 'Login');

                                        // Quick copy action for the compact row
                                        const handleQuickCopy = (e) => {
                                            e.stopPropagation();
                                            if (isCard) {
                                                const num = item.cardData?.cardNumber || item.password;
                                                if (num) copyToClipboard(num, 'card number', item.id);
                                            } else if (isAddress && item.addressData) {
                                                const fullAddr = `${item.addressData.streetAddress || ''} ${item.addressData.unit || ''}, ${item.addressData.city || ''}, ${item.addressData.state || ''} ${item.addressData.postalCode || ''}, ${item.addressData.country || ''}`.trim();
                                                copyToClipboard(fullAddr, 'address', item.id);
                                            } else if (isPasskey) {
                                                const cred = item.passkeyData?.credentialId || item.id;
                                                copyToClipboard(cred, 'passkey credential', item.id);
                                            } else if (item.password) {
                                                copyToClipboard(item.password, 'password', item.id);
                                            }
                                        };

                                        const quickCopyLabel = isCard ? 'card number' : isAddress ? 'address' : isPasskey ? 'passkey credential' : 'password';
                                        const isQuickCopied = copiedId === `${quickCopyLabel}-${item.id}`;

                                        return (
                                            <div
                                                key={item.id}
                                                style={{ animationDelay: `${Math.min(index, 10) * 35}ms` }}
                                                className={`rounded-2xl shrink-0 min-h-[52px] transition-all duration-200 group border overflow-hidden animate-tile-in relative ${
                                                    deletingIds.has(item.id) ? 'animate-row-collapse pointer-events-none' : ''
                                                } ${
                                                    isExpanded
                                                        ? (isBright ? 'bg-black/[0.05] border-accent/60 shadow-md ring-1 ring-accent/20' : 'bg-black/45 border-accent/50 shadow-lg ring-1 ring-accent/30')
                                                        : (isBright
                                                            ? 'bg-black/[0.035] hover:bg-black/[0.06] border-black/[0.08] hover:border-black/[0.14] shadow-xs hover:-translate-y-0.5'
                                                            : 'bg-black/25 hover:bg-black/35 border-white/[0.08] hover:border-white/[0.14] hover:-translate-y-0.5 hover:shadow-md')
                                                }`}
                                            >
                                                {/* Compact Row Header (~52px) */}
                                                <div
                                                    onClick={() => toggleItemExpanded(item.id)}
                                                    className="p-2.5 px-3 min-h-[52px] flex items-center justify-between gap-2.5 cursor-pointer select-none"
                                                    title={isExpanded ? 'Click to collapse' : 'Click to view details'}
                                                >
                                                    {/* Left: Badge & Middle: Title/Subtitle */}
                                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                        <div
                                                            className={`w-8 h-8 rounded-full flex items-center justify-center border shrink-0 transition-colors ${
                                                                isPasskey
                                                                    ? (isBright ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-purple-500/15 text-purple-300 border-purple-500/30')
                                                                    : isCard
                                                                        ? (isBright ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-blue-500/15 text-blue-300 border-blue-500/30')
                                                                        : isAddress
                                                                            ? (isBright ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-amber-500/15 text-amber-300 border-amber-500/30')
                                                                            : (isBright ? 'bg-sky-100 text-sky-700 border-sky-200' : 'bg-sky-500/15 text-sky-300 border-sky-500/30')
                                                            }`}
                                                        >
                                                            {isPasskey ? <Fingerprint size={14} /> :
                                                             isCard ? <CreditCard size={14} /> :
                                                             isAddress ? <MapPin size={14} /> :
                                                             <Globe size={14} />}
                                                        </div>
                                                        <div className="flex flex-col min-w-0 flex-1 justify-center gap-0.5">
                                                            <div className="flex items-center gap-1.5 min-w-0">
                                                                <span className={`text-xs font-semibold truncate leading-snug select-none ${isBright ? 'text-zinc-900' : 'text-white'}`}>
                                                                    {item.title}
                                                                </span>
                                                                {isSiteMatch && (
                                                                    <span className="px-1.5 py-0.2 rounded-full text-[8px] font-mono font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                                                                        Site Match
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className={`text-[11px] truncate font-mono leading-snug select-none ${isBright ? 'text-zinc-500' : 'text-white/60'}`}>
                                                                {subtitle}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Right: Actions & Expand Chevron */}
                                                    <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                                                        {/* Site-Match Autofill Pill (only shown for matching sites) */}
                                                        {isSiteMatch && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleAutofillPage(item)}
                                                                className={`px-2 py-0.5 rounded-full border text-[10px] font-bold flex items-center gap-1 transition active:scale-95 cursor-pointer shrink-0 ${
                                                                    isBright
                                                                        ? 'bg-accent/20 hover:bg-accent/30 text-zinc-900 border-accent/40'
                                                                        : 'bg-accent hover:brightness-110 text-zinc-950 border border-accent/40 shadow-xs'
                                                                }`}
                                                                title="Autofill on active page"
                                                            >
                                                                <Zap size={10} strokeWidth={2.5} />
                                                                <span>Autofill</span>
                                                            </button>
                                                        )}

                                                        {/* Hover Quick Actions */}
                                                        <div className={`${isExpanded ? 'max-w-[130px] opacity-100' : 'max-w-0 opacity-0 group-hover:max-w-[130px] group-hover:opacity-100'} transition-all duration-200 ease-out overflow-hidden flex items-center gap-1 shrink-0`}>
                                                            {!isSiteMatch && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleAutofillPage(item)}
                                                                    className={`w-6 h-6 rounded-full flex items-center justify-center border transition active:scale-95 cursor-pointer shrink-0 ${
                                                                        isBright
                                                                            ? 'bg-black/[0.04] hover:bg-black/[0.08] text-zinc-600 hover:text-zinc-900 border-black/10'
                                                                            : 'bg-white/[0.08] hover:bg-white/[0.14] text-white/70 hover:text-white border-white/10'
                                                                    }`}
                                                                    title="Autofill on active page"
                                                                >
                                                                    <Zap size={11} strokeWidth={2} />
                                                                </button>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={handleQuickCopy}
                                                                className={`w-6 h-6 rounded-full flex items-center justify-center border transition active:scale-95 cursor-pointer shrink-0 ${
                                                                    isBright
                                                                        ? 'bg-black/[0.04] hover:bg-black/[0.08] text-zinc-600 hover:text-zinc-900 border-black/10'
                                                                        : 'bg-white/[0.08] hover:bg-white/[0.14] text-white/70 hover:text-white border-white/10'
                                                                }`}
                                                                title={`Copy ${isCard ? 'Card Number' : isAddress ? 'Address' : isPasskey ? 'Credential' : 'Password'}`}
                                                            >
                                                                {isQuickCopied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenEditForm(item)}
                                                                className={`w-6 h-6 rounded-full flex items-center justify-center transition active:scale-95 cursor-pointer shrink-0 ${
                                                                    isBright ? 'hover:bg-black/[0.06] text-zinc-500 hover:text-zinc-900' : 'hover:bg-white/[0.10] text-white/70 hover:text-white'
                                                                }`}
                                                                title="Edit Item"
                                                            >
                                                                <Pencil size={11} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteItem(item.id, item.title)}
                                                                className={`w-6 h-6 rounded-full flex items-center justify-center transition active:scale-95 cursor-pointer shrink-0 ${
                                                                    isBright ? 'hover:bg-red-500/10 text-zinc-500 hover:text-red-600' : 'hover:bg-red-500/25 text-white/70 hover:text-red-400'
                                                                }`}
                                                                title="Delete Item"
                                                            >
                                                                <Trash2 size={11} />
                                                            </button>
                                                        </div>

                                                        {/* Chevron Toggle */}
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleItemExpanded(item.id);
                                                            }}
                                                            className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer ml-0.5 shrink-0 ${
                                                                isBright
                                                                    ? 'hover:bg-black/[0.06] text-zinc-500 hover:text-zinc-900'
                                                                    : 'hover:bg-white/[0.12] text-white/60 hover:text-white'
                                                                } ${isExpanded ? 'rotate-180 text-accent bg-accent/15' : ''}`}
                                                            title={isExpanded ? 'Collapse' : 'Expand details'}
                                                        >
                                                            <ChevronDown size={13} className="transition-transform duration-300" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Expandable Details Drawer with Fluid Accordion Animation */}
                                                <div className={`vault-accordion-wrapper ${isExpanded ? 'open' : 'pointer-events-none'}`}>
                                                    <div className="vault-accordion-inner">
                                                        <div className={`px-3 pb-3 pt-1 flex flex-col gap-2 border-t ${
                                                            isBright ? 'border-black/[0.06] bg-black/[0.015]' : 'border-white/[0.06] bg-black/15'
                                                        }`}>
                                                        {/* LOGIN / PASSWORD DETAILS */}
                                                        {isLogin && (
                                                            <div className="flex flex-col gap-2">
                                                                {/* Password Row */}
                                                                {item.password && (
                                                                    <div className={`flex items-center justify-between text-[11px] font-mono px-3 py-1.5 rounded-xl border ${
                                                                        isBright ? 'bg-black/[0.03] border-black/5 text-zinc-700' : 'bg-white/[0.04] border-white/[0.06] text-white/80'
                                                                    }`}>
                                                                        <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                                                                            <span className={`text-[10px] font-semibold opacity-60 shrink-0 ${isBright ? 'text-zinc-600' : 'text-white/60'}`}>Password:</span>
                                                                            <span className={`truncate select-all font-mono font-medium ${isBright ? 'text-zinc-900' : 'text-white'}`}>
                                                                                {isRevealed ? item.password : '••••••••••••'}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex items-center gap-1 shrink-0 ml-2">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => toggleReveal(item.id)}
                                                                                className={`w-6 h-6 rounded-full flex items-center justify-center transition active:scale-95 cursor-pointer ${
                                                                                    isBright ? 'hover:bg-black/[0.06] text-zinc-500 hover:text-zinc-900' : 'hover:bg-white/[0.10] text-white/70 hover:text-white'
                                                                                }`}
                                                                                title={isRevealed ? 'Hide Password' : 'Show Password'}
                                                                            >
                                                                                {isRevealed ? <EyeOff size={11} /> : <Eye size={11} />}
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => copyToClipboard(item.password, 'password', item.id)}
                                                                                className={`w-6 h-6 rounded-full flex items-center justify-center border transition active:scale-95 cursor-pointer ${
                                                                                    isBright ? 'bg-black/[0.04] hover:bg-black/[0.08] text-zinc-600 hover:text-zinc-900 border-black/10' : 'bg-white/[0.08] hover:bg-white/[0.14] text-white/70 hover:text-white border-white/10'
                                                                                }`}
                                                                                title="Copy Password"
                                                                            >
                                                                                {copiedId === `password-${item.id}` ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* URL Link Row */}
                                                                {item.url && (
                                                                    <div className={`flex items-center justify-between text-[11px] px-3 py-1.5 rounded-xl border ${
                                                                        isBright ? 'bg-black/[0.03] border-black/5' : 'bg-white/[0.04] border-white/[0.06]'
                                                                    }`}>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                const targetUrl = item.url.startsWith('http://') || item.url.startsWith('https://')
                                                                                    ? item.url
                                                                                    : `https://${item.url}`;
                                                                                useTabStore.getState().addTab(targetUrl);
                                                                            }}
                                                                            className="flex items-center gap-1.5 text-[11px] font-mono text-sky-400 hover:text-sky-300 hover:underline truncate max-w-[230px] text-left cursor-pointer"
                                                                            title={`Open ${item.url} in new tab`}
                                                                        >
                                                                            <Globe size={11} className="shrink-0 text-sky-400" />
                                                                            <span className="truncate">{item.url.replace(/^https?:\/\//, '')}</span>
                                                                            <ExternalLink size={10} className="shrink-0 opacity-70" />
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => copyToClipboard(item.url, 'url', item.id)}
                                                                            className={`w-6 h-6 rounded-full flex items-center justify-center border transition active:scale-95 cursor-pointer ${
                                                                                isBright ? 'bg-black/[0.04] hover:bg-black/[0.08] text-zinc-600 hover:text-zinc-900 border-black/10' : 'bg-white/[0.08] hover:bg-white/[0.14] text-white/70 hover:text-white border-white/10'
                                                                            }`}
                                                                            title="Copy URL"
                                                                        >
                                                                            {copiedId === `url-${item.id}` ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                                                                        </button>
                                                                    </div>
                                                                )}

                                                                {/* Inline 2FA Display */}
                                                                {inlineTotpSecret && (
                                                                    <div className={`flex items-center justify-between text-[10px] font-mono px-3 py-1.5 rounded-xl border transition-all ${
                                                                        isBright
                                                                            ? 'bg-emerald-500/[0.06] border-emerald-500/20 text-emerald-950'
                                                                            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                                                                    }`}>
                                                                        <div className="flex items-center gap-2 min-w-0">
                                                                            <ShieldCheck size={12} className={isBright ? 'text-emerald-700' : 'text-emerald-400'} />
                                                                            <span className="font-semibold text-[10px] tracking-wide opacity-80">2FA:</span>
                                                                            {inlineTotpCode ? (
                                                                                <span className={`font-mono font-bold tracking-widest text-[11px] select-all ${
                                                                                    isBright ? 'text-zinc-950 font-extrabold' : 'text-white'
                                                                                }`}>
                                                                                    {formatTotpCode(inlineTotpCode)}
                                                                                </span>
                                                                            ) : (
                                                                                <div className="flex items-center gap-1.5">
                                                                                    <span className="text-[10px] text-amber-400 font-mono font-medium">Setup Key Needed</span>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => handleOpenEditForm(item)}
                                                                                        className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold border transition active:scale-95 cursor-pointer ${
                                                                                            isBright
                                                                                                ? 'bg-amber-500/15 text-amber-900 border-amber-500/30 hover:bg-amber-500/25'
                                                                                                : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                                                                                        }`}
                                                                                        title="Add 2FA Secret Key"
                                                                                    >
                                                                                        Edit
                                                                                    </button>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-center gap-2 shrink-0">
                                                                            <CountdownRing remaining={totpRemaining} size={20} strokeWidth={2} />
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    if (inlineTotpCode) {
                                                                                        copyToClipboard(inlineTotpCode, '2FA code', item.id);
                                                                                    } else {
                                                                                        handleOpenEditForm(item);
                                                                                    }
                                                                                }}
                                                                                className={`w-6 h-6 rounded-full flex items-center justify-center border transition active:scale-95 cursor-pointer ${
                                                                                    copiedId === `2FA code-${item.id}`
                                                                                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                                                                                        : isBright
                                                                                            ? 'bg-black/[0.04] hover:bg-black/[0.08] text-zinc-700 border-black/10'
                                                                                            : 'bg-white/[0.08] hover:bg-white/[0.14] text-white border-white/10'
                                                                                }`}
                                                                                title={inlineTotpCode ? "Copy 2FA code" : "Configure 2FA key"}
                                                                            >
                                                                                {copiedId === `2FA code-${item.id}` ? (
                                                                                    <Check size={11} className="text-emerald-500" />
                                                                                ) : inlineTotpCode ? (
                                                                                    <Copy size={11} />
                                                                                ) : (
                                                                                    <Pencil size={11} />
                                                                                )}
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* PASSKEY DETAILS */}
                                                        {isPasskey && (
                                                            <div className={`flex flex-col gap-1.5 text-[11px] font-mono px-3 py-2 rounded-xl border ${
                                                                isBright ? 'bg-purple-500/[0.06] border-purple-500/15 text-purple-900' : 'bg-purple-500/10 border-purple-500/20 text-purple-200'
                                                            }`}>
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-[10px] opacity-75">Relying Party:</span>
                                                                    <span className={`font-semibold ${isBright ? 'text-purple-700' : 'text-purple-300'}`}>
                                                                        {item.passkeyData?.rpId || item.url || 'WebAuthn'}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <span className="text-[10px] opacity-75 shrink-0">Credential ID:</span>
                                                                    <span className="truncate text-[10px] opacity-80 max-w-[170px] select-all">
                                                                        {item.passkeyData?.credentialId || item.id}
                                                                    </span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => copyToClipboard(item.passkeyData?.credentialId || item.id, 'passkey credential', item.id)}
                                                                        className={`px-2 py-0.5 rounded-full border text-[9px] font-medium transition active:scale-95 cursor-pointer ${
                                                                            isBright ? 'text-purple-700 border-purple-300 hover:bg-purple-50' : 'text-purple-300 border-purple-500/35 hover:bg-purple-500/15'
                                                                        }`}
                                                                    >
                                                                        {copiedId === `passkey credential-${item.id}` ? 'Copied' : 'Copy'}
                                                                    </button>
                                                                </div>
                                                                {item.createdAt && (
                                                                    <div className="flex items-center justify-between text-[9px] opacity-60 pt-0.5 border-t border-purple-500/15">
                                                                        <span>Registered:</span>
                                                                        <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* PAYMENT CARD DETAILS */}
                                                        {isCard && (
                                                            <div className={`flex flex-col gap-1.5 text-[11px] font-mono px-3 py-2 rounded-xl border ${
                                                                isBright ? 'bg-black/[0.025] border-black/5 text-zinc-700' : 'bg-white/[0.04] border-white/[0.06] text-white/80'
                                                            }`}>
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={`font-semibold ${isBright ? 'text-blue-700' : 'text-blue-300'}`}>
                                                                            {item.cardData?.cardBrand || 'Card'}:
                                                                        </span>
                                                                        <span className="tracking-wider">
                                                                            •••• •••• •••• {item.cardData?.cardNumber?.slice(-4) || item.password?.slice(-4) || '••••'}
                                                                        </span>
                                                                    </div>
                                                                    {item.cardData?.cardNumber && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => copyToClipboard(item.cardData.cardNumber, 'card number', item.id)}
                                                                            className={`px-2 py-0.5 rounded-full border text-[9px] font-medium transition active:scale-95 cursor-pointer ${
                                                                                isBright ? 'border-black/10 hover:bg-black/5 text-zinc-700' : 'border-white/10 hover:bg-white/10 text-white'
                                                                            }`}
                                                                        >
                                                                            {copiedId === `card number-${item.id}` ? 'Copied' : 'Copy Number'}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center justify-between pt-1 border-t border-black/5 dark:border-white/5 text-[10px]">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="opacity-60">Expires:</span>
                                                                        <span>{item.cardData?.expMonth || '••'}/{item.cardData?.expYear?.slice(-2) || '••'}</span>
                                                                    </div>
                                                                    {item.cardData?.cvv && (
                                                                        <div className="flex items-center gap-1.5">
                                                                            <span className="opacity-60">CVV:</span>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => copyToClipboard(item.cardData.cvv, 'CVV', item.id)}
                                                                                className={`px-2 py-0.5 rounded-full text-[9px] font-medium transition active:scale-95 cursor-pointer ${
                                                                                    isBright ? 'bg-black/5 hover:bg-black/10 text-zinc-700' : 'bg-white/10 hover:bg-white/15 text-white'
                                                                                }`}
                                                                            >
                                                                                {copiedId === `CVV-${item.id}` ? 'Copied' : 'Copy CVV'}
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* ADDRESS DETAILS */}
                                                        {isAddress && (
                                                            <div className={`flex flex-col gap-1.5 text-[11px] font-mono px-3 py-2 rounded-xl border leading-snug ${
                                                                isBright ? 'bg-black/[0.025] border-black/5 text-zinc-700' : 'bg-white/[0.04] border-white/[0.06] text-white/80'
                                                            }`}>
                                                                <div className="flex items-start justify-between gap-2">
                                                                    <div className="flex flex-col">
                                                                        <span className={`font-semibold ${isBright ? 'text-amber-800' : 'text-amber-300'}`}>
                                                                            {item.addressData?.streetAddress} {item.addressData?.unit ? `(${item.addressData.unit})` : ''}
                                                                        </span>
                                                                        <span className={`text-[10px] ${isBright ? 'text-zinc-600' : 'text-white/70'}`}>
                                                                            {[item.addressData?.city, item.addressData?.state, item.addressData?.postalCode, item.addressData?.country].filter(Boolean).join(', ')}
                                                                        </span>
                                                                    </div>
                                                                    {item.addressData && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => copyToClipboard(`${item.addressData.streetAddress || ''} ${item.addressData.unit || ''}, ${item.addressData.city || ''}, ${item.addressData.state || ''} ${item.addressData.postalCode || ''}, ${item.addressData.country || ''}`.trim(), 'address', item.id)}
                                                                            className={`px-2 py-0.5 rounded-full border text-[9px] font-medium shrink-0 transition active:scale-95 cursor-pointer ${
                                                                                isBright ? 'border-black/10 hover:bg-black/5 text-zinc-700' : 'border-white/10 hover:bg-white/10 text-white'
                                                                            }`}
                                                                        >
                                                                            {copiedId === `address-${item.id}` ? 'Copied' : 'Copy Address'}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                                {(item.addressData?.phoneNumber || item.addressData?.email) && (
                                                                    <div className="flex items-center gap-3 pt-1 border-t border-black/5 dark:border-white/5 text-[10px] opacity-75">
                                                                        {item.addressData?.phoneNumber && <span>Tel: {item.addressData.phoneNumber}</span>}
                                                                        {item.addressData?.email && <span>{item.addressData.email}</span>}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
