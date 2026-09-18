import React, { useState, useEffect } from 'react';
import { 
    Lock, Unlock, KeyRound, Eye, EyeOff, Copy, Plus, Search, 
    ShieldCheck, Check, X, RefreshCw, Globe, Fingerprint, 
    Zap, Settings, ArrowLeft, Shield, Sparkles, Pencil, Trash2,
    CreditCard, MapPin, Building2, Phone, Mail, Calendar, Hash
} from 'lucide-react';
import useVaultStore from '../../store/useVaultStore';
import useUIStore from '../../store/useUIStore';
import useTabStore from '../../store/useTabStore';

export default function QVaultPopover({ isClosing }) {
    const { 
        isUnlocked, masterPassword, pinCode, unlock, unlockWithPin, 
        setPin, lock, passwords, fetchPasswords, addNewItem, deleteItem, updateItem, isLoading, error 
    } = useVaultStore();

    const showToast = useUIStore(state => state.showToast);
    const currentUrl = useUIStore(state => state.currentUrl);

    // View Modes: 'vault' | 'add' | 'settings'
    const [viewMode, setViewMode] = useState('vault');
    const [categoryFilter, setCategoryFilter] = useState('all'); // 'all' | 'logins' | 'cards' | 'addresses' | 'passkeys' | 'generator'
    const [unlockMode, setUnlockMode] = useState(pinCode ? 'pin' : 'password');
    const [editingItemId, setEditingItemId] = useState(null);

    // Inputs & UX State
    const [masterPassInput, setMasterPassInput] = useState('');
    const [pinInput, setPinInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [revealedPasswords, setRevealedPasswords] = useState({});
    const [copiedId, setCopiedId] = useState(null);

    // Settings View Inputs
    const [newPinInput, setNewPinInput] = useState(pinCode || '');
    const [oldPassInput, setOldPassInput] = useState('');
    const [newMasterPass, setNewMasterPass] = useState('');
    const [confirmMasterPass, setConfirmMasterPass] = useState('');
    const [isChangingPass, setIsChangingPass] = useState(false);

    // Add Item Form Inputs
    const [newItemType, setNewItemType] = useState('login'); // 'login' | 'card' | 'address' | 'passkey'
    const [title, setTitle] = useState('');
    const [url, setUrl] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
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

    const handleUnlockSubmit = async (e) => {
        e.preventDefault();
        if (unlockMode === 'password') {
            if (!masterPassInput.trim()) return;
            const success = await unlock(masterPassInput);
            if (success) {
                sessionStorage.setItem('qbrowse_vault_mp', masterPassInput);
                setMasterPassInput('');
            }
        } else {
            if (!pinInput.trim()) return;
            await unlockWithPin(pinInput);
            setPinInput('');
        }
    };

    const handleSavePin = (e) => {
        e.preventDefault();
        if (newPinInput && newPinInput.length < 4) {
            showToast('PIN must be at least 4 digits', 'error');
            return;
        }
        setPin(newPinInput);
        showToast(newPinInput ? 'Quick PIN updated!' : 'Quick PIN disabled');
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
            const success = await window.electronAPI.changeMasterPassword(oldPassInput, newMasterPass);
            if (success) {
                showToast('Master password changed successfully!');
                setOldPassInput('');
                setNewMasterPass('');
                setConfirmMasterPass('');
                setViewMode('vault');
            } else {
                showToast('Current password incorrect', 'error');
            }
        } catch {
            showToast('Failed to change password', 'error');
        } finally {
            setIsChangingPass(false);
        }
    };

    const handleOpenAddForm = (type = 'login') => {
        setEditingItemId(null);
        setNewItemType(type);
        setViewMode('add');

        if (currentUrl && currentUrl !== 'about:blank') {
            try {
                const u = new URL(currentUrl);
                const hostClean = u.hostname.replace('www.', '');
                setTitle(type === 'login' ? hostClean : (type === 'card' ? 'My Card' : (type === 'address' ? 'Home Address' : hostClean)));
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
        setUrl(item.url || '');
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

    const handleDeleteItem = async (id, title) => {
        try {
            await deleteItem(id);
            showToast(`Deleted ${title} from QVault`);
        } catch (err) {
            showToast(`Delete failed: ${err.message || err}`, 'error');
        }
    };

    const handleSaveNewItem = async (e) => {
        e.preventDefault();
        if (!title.trim()) {
            showToast('Title / Nickname is required', 'error');
            return;
        }

        setIsSaving(true);
        try {
            let passkeyData = null;
            let cardData = null;
            let addressData = null;
            let finalUsername = username;
            let finalPassword = password;

            if (newItemType === 'passkey') {
                const credId = passkeyCredId.trim() || ('pk_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now().toString(36));
                const existingPubKey = (editingItemId && passwords.find(p => p.id === editingItemId)?.passkeyData?.publicKey) || null;
                let pubKey = existingPubKey;
                try {
                    if (password && password.startsWith('{')) {
                        const parsed = JSON.parse(password);
                        if (parsed.publicKey) pubKey = parsed.publicKey;
                    }
                } catch {}

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

                            // 1. Card Number
                            const numInputs = document.querySelectorAll('input[autocomplete*="cc-number"], input[name*="cardnumber" i], input[name*="card_number" i], input[name*="cardNumber" i], input[name*="creditcard" i], input[id*="card" i], input[id*="cc_num" i], input[name*="pan" i]');
                            if (numInputs.length > 0 && card.cardNumber) {
                                filled = setVal(numInputs[0], card.cardNumber) || filled;
                            }

                            // 2. Cardholder Name
                            const nameInputs = document.querySelectorAll('input[autocomplete*="cc-name"], input[name*="cardholder" i], input[name*="card_name" i], input[name*="ccname" i], input[id*="cardholder" i]');
                            if (nameInputs.length > 0 && card.cardholderName) {
                                filled = setVal(nameInputs[0], card.cardholderName) || filled;
                            }

                            // 3. Expiration Date (combined or separate)
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

                            // 4. CVV / CVC
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

                            // 1. Full Name / First Name / Last Name
                            const nameInputs = document.querySelectorAll('input[autocomplete="name"], input[name*="fullname" i], input[name*="name" i]:not([name*="user"]):not([name*="card"])');
                            if (nameInputs.length > 0 && addr.fullName) {
                                filled = setVal(nameInputs[0], addr.fullName) || filled;
                            }

                            // 2. Email
                            const emailInputs = document.querySelectorAll('input[type="email"], input[autocomplete*="email"], input[name*="email" i]');
                            if (emailInputs.length > 0 && addr.email) {
                                filled = setVal(emailInputs[0], addr.email) || filled;
                            }

                            // 3. Phone
                            const telInputs = document.querySelectorAll('input[type="tel"], input[autocomplete*="tel"], input[name*="phone" i], input[name*="tel" i]');
                            if (telInputs.length > 0 && addr.phone) {
                                filled = setVal(telInputs[0], addr.phone) || filled;
                            }

                            // 4. Street Address (Line 1)
                            const streetInputs = document.querySelectorAll('input[autocomplete*="address-line1"], input[autocomplete*="street-address"], input[name*="address1" i], input[name*="street" i], input[id*="address1" i]');
                            if (streetInputs.length > 0 && addr.streetAddress) {
                                filled = setVal(streetInputs[0], addr.streetAddress) || filled;
                            }

                            // 5. Unit / Apt (Line 2)
                            const unitInputs = document.querySelectorAll('input[autocomplete*="address-line2"], input[name*="address2" i], input[name*="apt" i], input[name*="suite" i]');
                            if (unitInputs.length > 0 && addr.unit) {
                                filled = setVal(unitInputs[0], addr.unit) || filled;
                            }

                            // 6. City
                            const cityInputs = document.querySelectorAll('input[autocomplete*="address-level2"], input[name*="city" i], input[id*="city" i]');
                            if (cityInputs.length > 0 && addr.city) {
                                filled = setVal(cityInputs[0], addr.city) || filled;
                            }

                            // 7. State / Region
                            const stateInputs = document.querySelectorAll('input[autocomplete*="address-level1"], select[autocomplete*="address-level1"], input[name*="state" i], select[name*="state" i], input[name*="province" i]');
                            if (stateInputs.length > 0 && addr.state) {
                                filled = setVal(stateInputs[0], addr.state) || filled;
                            }

                            // 8. ZIP / Postal Code
                            const zipInputs = document.querySelectorAll('input[autocomplete*="postal-code"], input[name*="zip" i], input[name*="postal" i], input[id*="zip" i]');
                            if (zipInputs.length > 0 && addr.postalCode) {
                                filled = setVal(zipInputs[0], addr.postalCode) || filled;
                            }

                            // 9. Country
                            const countryInputs = document.querySelectorAll('select[autocomplete*="country"], select[name*="country" i], input[name*="country" i]');
                            if (countryInputs.length > 0 && addr.country) {
                                filled = setVal(countryInputs[0], addr.country) || filled;
                            }

                            return filled;
                        })();
                    `;
                } else {
                    // Standard Login (Username & Password)
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
                    passkeyData: parsed.passkeyData || meta.passkeyData,
                    cardData: parsed.cardData || meta.cardData,
                    addressData: parsed.addressData || meta.addressData
                };
            } catch {}
        }
        return {
            ...p,
            title: cleanTitle,
            itemType: p.itemType || meta.type || 'login',
            passkeyData: p.passkeyData || meta.passkeyData || null,
            cardData: p.cardData || meta.cardData || null,
            addressData: p.addressData || meta.addressData || null
        };
    });

    const filteredItems = parsedItems.filter(item => {
        const q = searchQuery.toLowerCase();
        const matchesQuery = (
            item.title.toLowerCase().includes(q) ||
            item.username?.toLowerCase().includes(q) ||
            item.url?.toLowerCase().includes(q) ||
            item.cardData?.cardholderName?.toLowerCase().includes(q) ||
            item.addressData?.fullName?.toLowerCase().includes(q) ||
            item.addressData?.city?.toLowerCase().includes(q)
        );
        if (!matchesQuery) return false;
        if (categoryFilter === 'all') return true;
        if (categoryFilter === 'logins') return item.itemType === 'login';
        if (categoryFilter === 'cards') return item.itemType === 'card';
        if (categoryFilter === 'addresses') return item.itemType === 'address';
        if (categoryFilter === 'passkeys') return item.itemType === 'passkey';
        return true;
    });

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

    const matchingSiteItems = parsedItems.filter(item => {
        if (!currentDomain) return false;
        const itemHost = item.url || item.title || '';
        if (domainsMatch(currentDomain, itemHost)) return true;
        if (item.passkeyData?.rpId && domainsMatch(currentDomain, item.passkeyData.rpId)) return true;
        return false;
    });

    return (
        <div 
            onClick={e => e.stopPropagation()} 
            className={`absolute top-4 right-4 z-[70000] w-[420px] rounded-3xl bg-[#0c0d10]/75 backdrop-blur-3xl border border-white/15 shadow-[0_30px_80px_rgba(0,0,0,0.7)] text-white overflow-hidden p-5 transition-all duration-300 ${isClosing ? 'animate-slide-up-fade-out' : 'animate-slide-down-fade'}`}
        >
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-white/15 mb-4">
                <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-2xl flex items-center justify-center border transition-colors ${isUnlocked ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-accent/20 text-accent border-accent/30'}`}>
                        {isUnlocked ? <Unlock size={16} /> : <Lock size={16} />}
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white tracking-wide">QVault</h3>
                        <p className="text-[10px] text-white/50">{isUnlocked ? `${passwords.length} saved items` : 'AES-256 Encrypted Vault'}</p>
                    </div>
                </div>

                {isUnlocked && (
                    <div className="flex items-center gap-2">
                        <button onClick={() => setViewMode(viewMode === 'settings' ? 'vault' : 'settings')} className={`p-2 rounded-xl border transition ${viewMode === 'settings' ? 'bg-accent/20 text-accent border-accent/30' : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'}`} title="Vault Settings">
                            <Settings size={15} />
                        </button>
                        <button onClick={() => handleOpenAddForm('login')} className="px-3.5 py-2 rounded-xl bg-accent text-white hover:brightness-110 text-xs font-bold flex items-center gap-1.5 transition shadow-md shadow-accent/20" title="Add to Vault">
                            <Plus size={14} strokeWidth={3} /> Add
                        </button>
                        <button onClick={lock} className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 text-xs transition" title="Lock Vault">
                            <Lock size={15} />
                        </button>
                    </div>
                )}
            </div>

            {/* LOCKED VIEW */}
            {!isUnlocked ? (
                <div className="flex flex-col gap-4 py-2">
                    {/* Unlock Mode Selector */}
                    {pinCode && (
                        <div className="flex bg-black/40 p-1 rounded-2xl border border-white/10 gap-1">
                            <button onClick={() => setUnlockMode('pin')} className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${unlockMode === 'pin' ? 'bg-accent text-white shadow-sm' : 'text-white/40 hover:text-white'}`}>
                                Quick PIN
                            </button>
                            <button onClick={() => setUnlockMode('password')} className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${unlockMode === 'password' ? 'bg-accent text-white shadow-sm' : 'text-white/40 hover:text-white'}`}>
                                Master Password
                            </button>
                        </div>
                    )}

                    <form onSubmit={handleUnlockSubmit} className="flex flex-col gap-4">
                        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3.5">
                            <Shield size={26} className="text-accent shrink-0" />
                            <div className="text-xs text-white/70 leading-relaxed">
                                {unlockMode === 'pin' ? 'Enter your 4-digit PIN to unlock QVault.' : 'Enter your Master Password to decrypt passwords, cards, and addresses.'}
                            </div>
                        </div>

                        {unlockMode === 'password' ? (
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Master Password</label>
                                <input
                                    type="password"
                                    autoFocus
                                    value={masterPassInput}
                                    onChange={(e) => setMasterPassInput(e.target.value)}
                                    placeholder="Enter master password..."
                                    className="w-full h-11 bg-black/40 border border-white/10 rounded-2xl px-4 text-sm font-mono text-white placeholder-white/30 outline-none focus:border-accent focus:bg-black/60 transition-all"
                                />
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">PIN Code</label>
                                <input
                                    type="password"
                                    autoFocus
                                    maxLength={6}
                                    value={pinInput}
                                    onChange={(e) => setPinInput(e.target.value)}
                                    placeholder="••••"
                                    className="w-full h-11 bg-black/40 border border-white/10 rounded-2xl px-4 text-center text-xl font-mono tracking-[0.5em] text-white placeholder-white/30 outline-none focus:border-accent focus:bg-black/60 transition-all"
                                />
                            </div>
                        )}

                        {error && (
                            <div className="text-xs text-red-400 font-semibold bg-red-500/10 border border-red-500/20 px-3.5 py-2 rounded-xl">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-11 mt-1 rounded-2xl bg-accent text-white hover:brightness-110 font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-accent/25 active:scale-[0.98] disabled:opacity-50"
                        >
                            {isLoading ? <RefreshCw size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                            Unlock Vault
                        </button>
                    </form>
                </div>
            ) : viewMode === 'settings' ? (
                /* SETTINGS VIEW */
                <div className="flex flex-col gap-4 py-1 animate-slide-down-fade">
                    <div className="flex justify-between items-center pb-2.5 border-b border-white/10">
                        <button onClick={() => setViewMode('vault')} className="flex items-center gap-2 text-xs font-bold text-white/80 hover:text-white transition">
                            <ArrowLeft size={15} /> Vault Settings
                        </button>
                    </div>

                    {/* Quick PIN Settings */}
                    <form onSubmit={handleSavePin} className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col gap-2.5">
                        <span className="text-xs font-bold text-white">Quick PIN Unlock</span>
                        <p className="text-[11px] text-white/50">Set a 4-6 digit PIN for fast vault access.</p>
                        <div className="flex gap-2 mt-1">
                            <input
                                type="password"
                                maxLength={6}
                                placeholder="Set PIN (e.g. 1234)"
                                value={newPinInput}
                                onChange={e => setNewPinInput(e.target.value)}
                                className="flex-1 h-10 bg-black/40 border border-white/10 rounded-xl px-3.5 text-center text-sm font-mono tracking-widest text-white outline-none focus:border-accent"
                            />
                            <button type="submit" className="px-4 h-10 rounded-xl bg-accent text-white font-bold text-xs hover:brightness-110 transition shadow-sm">
                                Save PIN
                            </button>
                        </div>
                    </form>

                    {/* Master Password Settings */}
                    <form onSubmit={handleChangeMasterPassword} className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col gap-3">
                        <span className="text-xs font-bold text-white">Change Master Password</span>
                        <input
                            type="password"
                            required
                            placeholder="Current Master Password"
                            value={oldPassInput}
                            onChange={e => setOldPassInput(e.target.value)}
                            className="h-10 bg-black/40 border border-white/10 rounded-xl px-3.5 text-xs text-white placeholder-white/30 outline-none focus:border-accent"
                        />
                        <input
                            type="password"
                            required
                            placeholder="New Master Password"
                            value={newMasterPass}
                            onChange={e => setNewMasterPass(e.target.value)}
                            className="h-10 bg-black/40 border border-white/10 rounded-xl px-3.5 text-xs text-white placeholder-white/30 outline-none focus:border-accent"
                        />
                        <input
                            type="password"
                            required
                            placeholder="Confirm New Master Password"
                            value={confirmMasterPass}
                            onChange={e => setConfirmMasterPass(e.target.value)}
                            className="h-10 bg-black/40 border border-white/10 rounded-xl px-3.5 text-xs text-white placeholder-white/30 outline-none focus:border-accent"
                        />
                        <button type="submit" disabled={isChangingPass} className="w-full h-10 mt-1 rounded-xl bg-white/10 border border-white/10 hover:bg-white/20 text-white font-bold text-xs transition">
                            {isChangingPass ? 'Updating...' : 'Update Master Password'}
                        </button>
                    </form>
                </div>
            ) : viewMode === 'add' ? (
                /* ADD / EDIT ITEM VIEW */
                <form onSubmit={handleSaveNewItem} className="flex flex-col gap-3.5 py-1 animate-slide-down-fade">
                    <div className="flex justify-between items-center pb-2.5 border-b border-white/10">
                        <button type="button" onClick={() => setViewMode('vault')} className="flex items-center gap-2 text-xs font-bold text-white/80 hover:text-white transition">
                            <ArrowLeft size={15} /> Back
                        </button>
                        <span className="text-xs font-bold text-white">{editingItemId ? 'Edit Item' : 'New Vault Item'}</span>
                    </div>

                    {/* Type Selector (4 Types) */}
                    <div className="grid grid-cols-4 gap-1 p-1 bg-black/40 rounded-2xl border border-white/10">
                        <button type="button" onClick={() => setNewItemType('login')} className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${newItemType === 'login' ? 'bg-accent text-white shadow-sm' : 'text-white/40 hover:text-white'}`}>
                            <Globe size={12} /> Login
                        </button>
                        <button type="button" onClick={() => setNewItemType('card')} className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${newItemType === 'card' ? 'bg-blue-600 text-white shadow-sm' : 'text-white/40 hover:text-white'}`}>
                            <CreditCard size={12} /> Card
                        </button>
                        <button type="button" onClick={() => setNewItemType('address')} className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${newItemType === 'address' ? 'bg-amber-600 text-white shadow-sm' : 'text-white/40 hover:text-white'}`}>
                            <MapPin size={12} /> Address
                        </button>
                        <button type="button" onClick={() => setNewItemType('passkey')} className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${newItemType === 'passkey' ? 'bg-purple-600 text-white shadow-sm' : 'text-white/40 hover:text-white'}`}>
                            <Fingerprint size={12} /> Passkey
                        </button>
                    </div>

                    <div className="flex flex-col gap-2.5 max-h-80 overflow-y-auto hide-scroll pr-1">
                        {/* Title / Label */}
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-white/40">
                                {newItemType === 'card' ? 'Card Nickname' : newItemType === 'address' ? 'Address Nickname' : 'Title'}
                            </label>
                            <input
                                type="text"
                                required
                                placeholder={newItemType === 'card' ? 'e.g. Chase Sapphire' : newItemType === 'address' ? 'e.g. Home or Office' : 'e.g. GitHub'}
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="h-10 bg-black/40 border border-white/10 rounded-xl px-3.5 text-xs text-white placeholder-white/30 outline-none focus:border-accent"
                            />
                        </div>

                        {/* LOGIN FIELDS */}
                        {newItemType === 'login' && (
                            <>
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-bold text-white/40">Website URL</label>
                                    <input
                                        type="text"
                                        placeholder="https://example.com"
                                        value={url}
                                        onChange={e => setUrl(e.target.value)}
                                        className="h-10 bg-black/40 border border-white/10 rounded-xl px-3.5 text-xs text-white placeholder-white/30 outline-none focus:border-accent"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-bold text-white/40">Username / Email</label>
                                    <input
                                        type="text"
                                        placeholder="user@domain.com"
                                        value={username}
                                        onChange={e => setUsername(e.target.value)}
                                        className="h-10 bg-black/40 border border-white/10 rounded-xl px-3.5 text-xs text-white placeholder-white/30 outline-none focus:border-accent"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[10px] font-bold text-white/40">Password</label>
                                        <button type="button" onClick={() => { generateCustomPassword(); setPassword(generatedResult); showToast('Generated password!'); }} className="text-[10px] text-accent font-semibold hover:underline">
                                            Generate Random
                                        </button>
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Password"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="h-10 bg-black/40 border border-white/10 rounded-xl px-3.5 text-xs font-mono text-white placeholder-white/30 outline-none focus:border-accent"
                                    />
                                </div>
                            </>
                        )}

                        {/* CREDIT CARD FIELDS */}
                        {newItemType === 'card' && (
                            <>
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-bold text-white/40">Cardholder Name</label>
                                    <input
                                        type="text"
                                        placeholder="Name on card"
                                        value={cardholderName}
                                        onChange={e => setCardholderName(e.target.value)}
                                        className="h-10 bg-black/40 border border-white/10 rounded-xl px-3.5 text-xs text-white placeholder-white/30 outline-none focus:border-blue-400"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[10px] font-bold text-white/40">Card Number</label>
                                        <span className="text-[10px] text-blue-400 font-bold uppercase">{cardBrand}</span>
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
                                        className="h-10 bg-black/40 border border-white/10 rounded-xl px-3.5 text-xs font-mono tracking-wider text-white placeholder-white/30 outline-none focus:border-blue-400"
                                    />
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] font-bold text-white/40">Exp Month</label>
                                        <input
                                            type="text"
                                            maxLength={2}
                                            placeholder="MM (e.g. 12)"
                                            value={cardExpMonth}
                                            onChange={e => setCardExpMonth(e.target.value.replace(/\D/g, ''))}
                                            className="h-10 bg-black/40 border border-white/10 rounded-xl px-3 text-xs text-center font-mono text-white placeholder-white/30 outline-none focus:border-blue-400"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] font-bold text-white/40">Exp Year</label>
                                        <input
                                            type="text"
                                            maxLength={4}
                                            placeholder="YYYY"
                                            value={cardExpYear}
                                            onChange={e => setCardExpYear(e.target.value.replace(/\D/g, ''))}
                                            className="h-10 bg-black/40 border border-white/10 rounded-xl px-3 text-xs text-center font-mono text-white placeholder-white/30 outline-none focus:border-blue-400"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] font-bold text-white/40">CVV / CVC</label>
                                        <input
                                            type="password"
                                            maxLength={4}
                                            placeholder="•••"
                                            value={cardCvv}
                                            onChange={e => setCardCvv(e.target.value.replace(/\D/g, ''))}
                                            className="h-10 bg-black/40 border border-white/10 rounded-xl px-3 text-xs text-center font-mono text-white placeholder-white/30 outline-none focus:border-blue-400"
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {/* ADDRESS FIELDS */}
                        {newItemType === 'address' && (
                            <>
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-bold text-white/40">Full Name</label>
                                    <input
                                        type="text"
                                        placeholder="Full recipient name"
                                        value={fullName}
                                        onChange={e => setFullName(e.target.value)}
                                        className="h-10 bg-black/40 border border-white/10 rounded-xl px-3.5 text-xs text-white placeholder-white/30 outline-none focus:border-amber-400"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-bold text-white/40">Street Address</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Street name and number"
                                        value={streetAddress}
                                        onChange={e => setStreetAddress(e.target.value)}
                                        className="h-10 bg-black/40 border border-white/10 rounded-xl px-3.5 text-xs text-white placeholder-white/30 outline-none focus:border-amber-400"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] font-bold text-white/40">Apt / Suite</label>
                                        <input
                                            type="text"
                                            placeholder="Apt 4B"
                                            value={unit}
                                            onChange={e => setUnit(e.target.value)}
                                            className="h-10 bg-black/40 border border-white/10 rounded-xl px-3.5 text-xs text-white placeholder-white/30 outline-none focus:border-amber-400"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] font-bold text-white/40">City</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="City"
                                            value={city}
                                            onChange={e => setCity(e.target.value)}
                                            className="h-10 bg-black/40 border border-white/10 rounded-xl px-3.5 text-xs text-white placeholder-white/30 outline-none focus:border-amber-400"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] font-bold text-white/40">State / Province</label>
                                        <input
                                            type="text"
                                            placeholder="State or Region"
                                            value={stateProvince}
                                            onChange={e => setStateProvince(e.target.value)}
                                            className="h-10 bg-black/40 border border-white/10 rounded-xl px-3.5 text-xs text-white placeholder-white/30 outline-none focus:border-amber-400"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] font-bold text-white/40">ZIP / Postal Code</label>
                                        <input
                                            type="text"
                                            placeholder="Postal code"
                                            value={postalCode}
                                            onChange={e => setPostalCode(e.target.value)}
                                            className="h-10 bg-black/40 border border-white/10 rounded-xl px-3.5 text-xs text-white placeholder-white/30 outline-none focus:border-amber-400"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] font-bold text-white/40">Phone Number</label>
                                        <input
                                            type="text"
                                            placeholder="+1 (555) 000-0000"
                                            value={phone}
                                            onChange={e => setPhone(e.target.value)}
                                            className="h-10 bg-black/40 border border-white/10 rounded-xl px-3.5 text-xs text-white placeholder-white/30 outline-none focus:border-amber-400"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] font-bold text-white/40">Email</label>
                                        <input
                                            type="email"
                                            placeholder="email@domain.com"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            className="h-10 bg-black/40 border border-white/10 rounded-xl px-3.5 text-xs text-white placeholder-white/30 outline-none focus:border-amber-400"
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {/* PASSKEY FIELDS */}
                        {newItemType === 'passkey' && (
                            <>
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-bold text-white/40">Domain / RP ID</label>
                                    <input
                                        type="text"
                                        placeholder="github.com"
                                        value={passkeyRpId}
                                        onChange={e => setPasskeyRpId(e.target.value)}
                                        className="h-10 bg-black/40 border border-white/10 rounded-xl px-3.5 text-xs text-white placeholder-white/30 outline-none focus:border-purple-400"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-bold text-white/40">Username / Account</label>
                                    <input
                                        type="text"
                                        placeholder="user@domain.com"
                                        value={username}
                                        onChange={e => setUsername(e.target.value)}
                                        className="h-10 bg-black/40 border border-white/10 rounded-xl px-3.5 text-xs text-white placeholder-white/30 outline-none focus:border-purple-400"
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    <div className="flex gap-2.5 mt-2 pt-2 border-t border-white/10">
                        <button type="button" onClick={() => setViewMode('vault')} className="flex-1 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 text-xs font-bold transition">
                            Cancel
                        </button>
                        <button type="submit" disabled={isSaving} className="flex-1 h-10 rounded-xl bg-accent text-white hover:brightness-110 font-bold text-xs transition shadow-md shadow-accent/20">
                            {isSaving ? 'Saving...' : 'Save to Vault'}
                        </button>
                    </div>
                </form>
            ) : (
                /* UNLOCKED MAIN VAULT VIEW */
                <div className="flex flex-col gap-3.5">
                    {/* Category Filter Pills (6 Categories) */}
                    <div className="flex items-center gap-1 p-1 bg-black/40 rounded-2xl border border-white/10 overflow-x-auto hide-scroll">
                        <button onClick={() => setCategoryFilter('all')} className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all ${categoryFilter === 'all' ? 'bg-white/15 text-white shadow-sm' : 'text-white/40 hover:text-white'}`}>
                            All ({parsedItems.length})
                        </button>
                        <button onClick={() => setCategoryFilter('logins')} className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all flex items-center gap-1 ${categoryFilter === 'logins' ? 'bg-accent text-white shadow-sm' : 'text-white/40 hover:text-white'}`}>
                            <Globe size={11} /> Logins ({parsedItems.filter(p => p.itemType === 'login').length})
                        </button>
                        <button onClick={() => setCategoryFilter('cards')} className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all flex items-center gap-1 ${categoryFilter === 'cards' ? 'bg-blue-600 text-white shadow-sm' : 'text-white/40 hover:text-white'}`}>
                            <CreditCard size={11} /> Cards ({parsedItems.filter(p => p.itemType === 'card').length})
                        </button>
                        <button onClick={() => setCategoryFilter('addresses')} className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all flex items-center gap-1 ${categoryFilter === 'addresses' ? 'bg-amber-600 text-white shadow-sm' : 'text-white/40 hover:text-white'}`}>
                            <MapPin size={11} /> Addresses ({parsedItems.filter(p => p.itemType === 'address').length})
                        </button>
                        <button onClick={() => setCategoryFilter('passkeys')} className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all flex items-center gap-1 ${categoryFilter === 'passkeys' ? 'bg-purple-600 text-white shadow-sm' : 'text-white/40 hover:text-white'}`}>
                            <Fingerprint size={11} /> Passkeys ({parsedItems.filter(p => p.itemType === 'passkey').length})
                        </button>
                        <button onClick={() => setCategoryFilter('generator')} className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all flex items-center gap-1 ${categoryFilter === 'generator' ? 'bg-emerald-600 text-white shadow-sm' : 'text-white/40 hover:text-white'}`}>
                            <Sparkles size={11} /> Gen
                        </button>
                    </div>

                    {categoryFilter === 'generator' ? (
                        /* GENERATOR TAB */
                        <div className="flex flex-col gap-3.5 py-1 animate-slide-down-fade">
                            <div className="p-3.5 bg-black/40 border border-white/10 rounded-2xl flex flex-col gap-2 relative">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">Generated Password</span>
                                <div className="flex items-center justify-between font-mono text-sm font-bold text-emerald-400 break-all select-all">
                                    <span>{generatedResult}</span>
                                    <button onClick={() => copyToClipboard(generatedResult, 'generated password', 'gen')} className="p-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 transition shrink-0 ml-2" title="Copy">
                                        <Copy size={14} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 p-3.5 bg-white/5 border border-white/10 rounded-2xl">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-white/80">Length: {genLength}</span>
                                    <input 
                                        type="range" 
                                        min={8} 
                                        max={32} 
                                        value={genLength} 
                                        onChange={e => setGenLength(Number(e.target.value))}
                                        className="w-32 accent-accent cursor-pointer"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-white/70 pt-2.5 border-t border-white/10">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={useUpper} onChange={e => setUseUpper(e.target.checked)} className="rounded accent-accent" /> A-Z (Upper)
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={useLower} onChange={e => setUseLower(e.target.checked)} className="rounded accent-accent" /> a-z (Lower)
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={useNumbers} onChange={e => setUseNumbers(e.target.checked)} className="rounded accent-accent" /> 0-9 (Numbers)
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={useSymbols} onChange={e => setUseSymbols(e.target.checked)} className="rounded accent-accent" /> !@#$ (Symbols)
                                    </label>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* VAULT ITEMS LIST VIEW */
                        <div className="flex flex-col gap-3">
                            {/* Saved for this website section */}
                            {currentDomain && matchingSiteItems.length > 0 && (
                                <div className="p-3 bg-accent/10 border border-accent/20 rounded-2xl flex flex-col gap-2 animate-slide-down-fade">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-bold text-accent uppercase tracking-wider flex items-center gap-1.5">
                                            <Globe size={13} /> Saved for {currentDomain}
                                        </span>
                                        <span className="text-[10px] bg-accent/20 px-2 py-0.5 rounded-full text-accent font-bold">
                                            {matchingSiteItems.length} matching
                                        </span>
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        {matchingSiteItems.map(item => (
                                            <div key={item.id} className="flex items-center justify-between bg-black/40 p-2.5 rounded-xl border border-white/10">
                                                <div className="flex flex-col truncate">
                                                    <span className="text-xs font-bold text-white truncate">{item.title}</span>
                                                    {item.username && <span className="text-[10px] text-white/50 truncate">{item.username}</span>}
                                                </div>
                                                <button onClick={() => handleAutofillPage(item)} className="px-3 py-1.5 rounded-xl bg-accent text-white hover:brightness-110 font-bold text-xs flex items-center gap-1 shadow-sm transition">
                                                    <Zap size={12} strokeWidth={3} /> Autofill
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Search bar */}
                            <div className="relative">
                                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                                <input
                                    type="text"
                                    placeholder="Search logins, cards, addresses..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full h-10 pl-10 pr-3.5 bg-black/40 border border-white/10 rounded-2xl text-xs text-white placeholder-white/30 outline-none focus:border-accent transition-colors"
                                />
                            </div>

                            {/* Items List */}
                            <div className="flex flex-col gap-2.5 max-h-72 overflow-y-auto hide-scroll pr-0.5">
                                {filteredItems.length === 0 ? (
                                    <div className="text-center text-white/40 text-xs italic py-8">
                                        {searchQuery ? 'No matching vault items found.' : 'Vault category is empty. Click + Add to store credentials, cards, or addresses!'}
                                    </div>
                                ) : (
                                    filteredItems.map((item) => {
                                        const isRevealed = revealedPasswords[item.id];
                                        const isCard = item.itemType === 'card';
                                        const isAddress = item.itemType === 'address';
                                        const isPasskey = item.itemType === 'passkey';

                                        return (
                                            <div key={item.id} className="p-3.5 bg-white/5 border border-white/10 hover:border-white/20 rounded-2xl flex flex-col gap-2.5 transition-all group">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center border shrink-0 ${
                                                            isPasskey ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' :
                                                            isCard ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                                                            isAddress ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                                                            'bg-accent/20 text-accent border-accent/30'
                                                        }`}>
                                                            {isPasskey ? <Fingerprint size={15} /> :
                                                             isCard ? <CreditCard size={15} /> :
                                                             isAddress ? <MapPin size={15} /> :
                                                             <Globe size={15} />}
                                                        </div>
                                                        <div className="flex flex-col truncate">
                                                            <span className="text-xs font-bold text-white truncate">{item.title}</span>
                                                            <span className="text-[10px] text-white/40 truncate">
                                                                {isCard ? (item.cardData?.cardholderName || item.username || 'Payment Card') :
                                                                 isAddress ? (item.addressData?.fullName || [item.addressData?.city, item.addressData?.country].filter(Boolean).join(', ') || 'Address') :
                                                                 (item.username || item.url || 'Login')}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Quick Actions */}
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        {/* Autofill button for all applicable types */}
                                                        <button onClick={() => handleAutofillPage(item)} className="px-2 py-1.5 rounded-xl bg-accent text-white hover:brightness-110 font-bold text-[10px] flex items-center gap-1 transition shadow-sm" title="Autofill on active page">
                                                            <Zap size={12} strokeWidth={3} /> Autofill
                                                        </button>

                                                        {/* Copy actions depending on type */}
                                                        {isCard && item.cardData?.cardNumber && (
                                                            <button onClick={() => copyToClipboard(item.cardData.cardNumber, 'card number', item.id)} className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition border border-white/10" title="Copy Card Number">
                                                                {copiedId === `card number-${item.id}` ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                                                            </button>
                                                        )}
                                                        {isAddress && item.addressData && (
                                                            <button onClick={() => copyToClipboard(`${item.addressData.streetAddress || ''} ${item.addressData.unit || ''}, ${item.addressData.city || ''}, ${item.addressData.state || ''} ${item.addressData.postalCode || ''}, ${item.addressData.country || ''}`.trim(), 'address', item.id)} className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition border border-white/10" title="Copy Full Address">
                                                                {copiedId === `address-${item.id}` ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                                                            </button>
                                                        )}
                                                        {!isCard && !isAddress && !isPasskey && item.password && (
                                                            <>
                                                                <button onClick={() => toggleReveal(item.id)} className="p-1.5 rounded-xl hover:bg-white/10 text-white/50 hover:text-white transition" title={isRevealed ? 'Hide Password' : 'Show Password'}>
                                                                    {isRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
                                                                </button>
                                                                <button onClick={() => copyToClipboard(item.password, 'password', item.id)} className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition border border-white/10" title="Copy Password">
                                                                    {copiedId === `password-${item.id}` ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                                                                </button>
                                                            </>
                                                        )}

                                                        <button onClick={() => handleOpenEditForm(item)} className="p-1.5 rounded-xl hover:bg-white/10 text-white/50 hover:text-white transition" title="Edit Item">
                                                            <Pencil size={13} />
                                                        </button>
                                                        <button onClick={() => handleDeleteItem(item.id, item.title)} className="p-1.5 rounded-xl hover:bg-red-500/20 text-white/50 hover:text-red-400 transition" title="Delete Item">
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Card Details View */}
                                                {isCard ? (
                                                    <div className="flex items-center justify-between text-[11px] font-mono bg-blue-500/10 border border-blue-500/20 px-3 py-2 rounded-xl text-blue-300">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-white">{item.cardData?.cardBrand || 'Card'}:</span>
                                                            <span>•••• •••• •••• {item.cardData?.cardNumber?.slice(-4) || item.password?.slice(-4) || '••••'}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-[10px] text-blue-300/80">
                                                            <span>{item.cardData?.expMonth || '••'}/{item.cardData?.expYear?.slice(-2) || '••'}</span>
                                                            {item.cardData?.cvv && (
                                                                <button onClick={() => copyToClipboard(item.cardData.cvv, 'CVV', item.id)} className="px-1.5 py-0.5 bg-blue-500/20 rounded text-[9px] hover:text-white">
                                                                    {copiedId === `CVV-${item.id}` ? 'Copied' : 'CVV'}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : isAddress ? (
                                                    <div className="flex flex-col gap-0.5 text-[11px] bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-xl text-amber-200 leading-snug">
                                                        <div className="font-medium text-white truncate">
                                                            {item.addressData?.streetAddress} {item.addressData?.unit ? `(${item.addressData.unit})` : ''}
                                                        </div>
                                                        <div className="text-[10px] text-amber-300/70 truncate">
                                                            {[item.addressData?.city, item.addressData?.state, item.addressData?.postalCode, item.addressData?.country].filter(Boolean).join(', ')}
                                                        </div>
                                                    </div>
                                                ) : isPasskey ? (
                                                    <div className="flex items-center justify-between text-[10px] font-mono bg-purple-500/10 border border-purple-500/20 px-3 py-1.5 rounded-xl text-purple-300">
                                                        <span>Passkey Domain: {item.passkeyData?.rpId || item.url || 'WebAuthn'}</span>
                                                        <button onClick={() => copyToClipboard(item.passkeyData?.credentialId || item.id, 'passkey credential', item.id)} className="text-[9px] underline hover:text-white">
                                                            {copiedId === `passkey credential-${item.id}` ? 'Copied' : 'Copy Credential'}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-between text-[11px] font-mono bg-black/40 px-3 py-1.5 rounded-xl border border-white/5">
                                                        <span className="text-white/80 truncate">
                                                            {isRevealed ? item.password : '••••••••••••'}
                                                        </span>
                                                        {item.url && (
                                                            <span className="text-[9px] text-white/30 truncate max-w-[120px]">
                                                                {item.url.replace(/^https?:\/\//, '')}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
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
