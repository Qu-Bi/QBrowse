(function () {
  'use strict';

  if (typeof globalThis === 'undefined' || globalThis.__QBROWSE_MV3_SHIM__) {
    return;
  }
  globalThis.__QBROWSE_MV3_SHIM__ = true;

  if (!globalThis.chrome || typeof globalThis.chrome !== 'object') {
    globalThis.chrome = {};
  }
  const chrome = globalThis.chrome;

  if (!chrome.runtime || typeof chrome.runtime !== 'object') {
    chrome.runtime = {};
  }

  function makeEvent() {
    const listeners = new Set();
    return {
      addListener(fn) {
        if (typeof fn === 'function') listeners.add(fn);
      },
      removeListener(fn) {
        listeners.delete(fn);
      },
      hasListener(fn) {
        return listeners.has(fn);
      },
      hasListeners() {
        return listeners.size > 0;
      },
      dispatch() {
        const args = arguments;
        for (const fn of Array.from(listeners)) {
          try {
            fn.apply(null, args);
          } catch (_) {}
        }
      }
    };
  }

  function ensureProp(obj, key, factory) {
    if (!obj || (typeof obj !== 'object' && typeof obj !== 'function')) return undefined;
    if (typeof obj[key] === 'undefined') {
      obj[key] = typeof factory === 'function' ? factory() : factory;
    }
    return obj[key];
  }

  function resolveWithCallback(valueOrFn, args) {
    const arr = Array.prototype.slice.call(args || []);
    const cb = arr.length > 0 && typeof arr[arr.length - 1] === 'function' ? arr[arr.length - 1] : null;
    try {
      const result = typeof valueOrFn === 'function' ? valueOrFn() : valueOrFn;
      if (result && typeof result.then === 'function') {
        return result.then(
          (val) => {
            if (cb) {
              try {
                chrome.runtime.lastError = undefined;
                cb(val);
              } catch (_) {}
            }
            return val;
          },
          (err) => {
            if (cb) {
              try {
                chrome.runtime.lastError = { message: err?.message || String(err) };
                cb(undefined);
              } catch (_) {}
              return undefined;
            }
            throw err;
          }
        );
      }
      if (cb) {
        queueMicrotask(() => {
          try {
            chrome.runtime.lastError = undefined;
            cb(result);
          } catch (_) {}
        });
      }
      return Promise.resolve(result);
    } catch (err) {
      if (cb) {
        queueMicrotask(() => {
          try {
            chrome.runtime.lastError = { message: err?.message || String(err) };
            cb(undefined);
          } catch (_) {}
        });
        return Promise.resolve(undefined);
      }
      return Promise.reject(err);
    }
  }

  function ensureNamespace(name) {
    if (!chrome[name] || typeof chrome[name] !== 'object') {
      chrome[name] = {};
    }
    return chrome[name];
  }

  function ensureEvent(ns, eventName) {
    return ensureProp(ns, eventName, makeEvent);
  }

  function ensureAsyncMethod(ns, methodName, impl) {
    if (typeof ns[methodName] === 'undefined') {
      ns[methodName] = function () {
        const args = arguments;
        return resolveWithCallback(() => impl.apply(null, args), args);
      };
    }
  }

  async function callBridge(method, args) {
    if (typeof fetch !== 'function') {
      throw new Error('fetch unavailable');
    }
    const headers = { 'content-type': 'application/json' };
    if (chrome.runtime && chrome.runtime.id) {
      headers['x-qbrowse-ext-id'] = String(chrome.runtime.id);
    }
    const res = await fetch('qbrowse-ext-rpc://bridge/call', {
      method: 'POST',
      headers,
      body: JSON.stringify({ method, args: Array.isArray(args) ? args : [] })
    });
    const data = await res.json();
    if (!data || data.ok === false) {
      throw new Error((data && data.error) || 'Bridge call failed');
    }
    return data.result;
  }

  function bindBridgeMethod(ns, methodName, rpcMethod, fallbackImpl) {
    ns[methodName] = function () {
      const raw = Array.prototype.slice.call(arguments);
      const hasCb = raw.length > 0 && typeof raw[raw.length - 1] === 'function';
      const argsForRpc = hasCb ? raw.slice(0, -1) : raw;
      return resolveWithCallback(async () => {
        try {
          return await callBridge(rpcMethod, argsForRpc);
        } catch (err) {
          if (typeof fallbackImpl === 'function') {
            return fallbackImpl.apply(null, argsForRpc);
          }
          throw err;
        }
      }, raw);
    };
  }

  // chrome.runtime missing events & shims
  const runtime = ensureNamespace('runtime');
  [
    'onInstalled',
    'onStartup',
    'onSuspend',
    'onSuspendCanceled',
    'onUpdateAvailable',
    'onRestartRequired',
    'onMessage',
    'onConnect',
    'onMessageExternal',
    'onConnectExternal'
  ].forEach((ev) => ensureEvent(runtime, ev));

  ensureAsyncMethod(runtime, 'openOptionsPage', () => callBridge('runtime.openOptionsPage', []).catch(() => undefined));
  ensureAsyncMethod(runtime, 'setUninstallURL', () => undefined);
  ensureAsyncMethod(runtime, 'getPlatformInfo', () => ({ os: 'win', arch: 'x86-64', nacl_arch: 'x86-64' }));
  ensureAsyncMethod(runtime, 'getBrowserInfo', () => ({ name: 'QBrowse', vendor: 'QBrowse', version: '136.0.0.0', buildID: 'qbrowse' }));
  // Always override getContexts to avoid Electron C++ NOTREACHED hit in runtime_api.cc:904
  // and return realistic BACKGROUND / POPUP / TAB contexts so Bitwarden never throws "No SW".
  runtime.getContexts = function (filter, cb) {
    const actualFilter = typeof filter === 'function' ? {} : (filter || {});
    const actualCb = typeof filter === 'function' ? filter : cb;
    return resolveWithCallback(() => {
      const extId = runtime.id || 'extension';
      const origin = `chrome-extension://${extId}`;
      const contexts = [
        {
          contextType: 'BACKGROUND',
          contextId: `sw-${extId}`,
          documentOrigin: origin,
          frameId: -1,
          incognito: false,
          tabId: -1,
          windowId: -1
        }
      ];
      if (typeof window !== 'undefined' && window.location && window.location.protocol === 'chrome-extension:') {
        const pathname = String(window.location.pathname || '');
        const ctxType = /popup/i.test(pathname) ? 'POPUP' : 'TAB';
        contexts.push({
          contextType: ctxType,
          contextId: `doc-${extId}`,
          documentOrigin: window.location.origin || origin,
          documentUrl: window.location.href || `${origin}/`,
          frameId: 0,
          incognito: false,
          tabId: -1,
          windowId: 1
        });
      }
      return contexts.filter((ctx) => {
        if (Array.isArray(actualFilter.contextTypes) && actualFilter.contextTypes.length > 0) {
          if (!actualFilter.contextTypes.includes(ctx.contextType)) return false;
        }
        if (Array.isArray(actualFilter.documentUrls) && actualFilter.documentUrls.length > 0) {
          if (!ctx.documentUrl || !actualFilter.documentUrls.includes(ctx.documentUrl)) return false;
        }
        return true;
      });
    }, typeof actualCb === 'function' ? [actualCb] : []);
  };
  if (typeof runtime.connectNative === 'undefined') {
    const connectNativeImpl = function (application) {
      const onMessage = makeEvent();
      const onDisconnect = makeEvent();
      const port = {
        name: String(application || ''),
        postMessage() {},
        disconnect() {},
        onMessage,
        onDisconnect
      };
      return port;
    };
    try {
      runtime.connectNative = connectNativeImpl;
    } catch (_) {
      try {
        Object.defineProperty(runtime, 'connectNative', { value: connectNativeImpl, configurable: true, writable: true });
      } catch (_) {}
    }
  }
  if (typeof runtime.sendNativeMessage === 'undefined') {
    const sendNativeMessageImpl = function (_application, _message, cb) {
      const errMsg = 'Specified native messaging host not found.';
      if (typeof cb === 'function') {
        queueMicrotask(() => {
          try {
            runtime.lastError = { message: errMsg };
            cb(undefined);
          } finally {
            runtime.lastError = undefined;
          }
        });
        return undefined;
      }
      return Promise.reject(new Error(errMsg));
    };
    try {
      runtime.sendNativeMessage = sendNativeMessageImpl;
    } catch (_) {
      try {
        Object.defineProperty(runtime, 'sendNativeMessage', { value: sendNativeMessageImpl, configurable: true, writable: true });
      } catch (_) {}
    }
  }
  if (typeof runtime.getURL === 'undefined') {
    runtime.getURL = (p) => `chrome-extension://${runtime.id || 'extension'}/${String(p || '').replace(/^\/+/, '')}`;
  }

  // chrome.webNavigation
  const webNavigation = ensureNamespace('webNavigation');
  [
    'onBeforeNavigate',
    'onCommitted',
    'onDOMContentLoaded',
    'onCompleted',
    'onErrorOccurred',
    'onHistoryStateUpdated',
    'onReferenceFragmentUpdated',
    'onTabReplaced',
    'onCreatedNavigationTarget'
  ].forEach((ev) => ensureEvent(webNavigation, ev));
  ensureAsyncMethod(webNavigation, 'getFrame', () => null);
  ensureAsyncMethod(webNavigation, 'getAllFrames', () => []);

  // chrome.sidePanel
  const sidePanel = ensureNamespace('sidePanel');
  let sidePanelOptions = { enabled: false };
  let sidePanelBehavior = { openPanelOnActionClick: false };
  ensureAsyncMethod(sidePanel, 'setOptions', (opts) => {
    if (opts && typeof opts === 'object') sidePanelOptions = { ...sidePanelOptions, ...opts };
    return undefined;
  });
  ensureAsyncMethod(sidePanel, 'getOptions', () => ({ ...sidePanelOptions }));
  ensureAsyncMethod(sidePanel, 'setPanelBehavior', (behavior) => {
    if (behavior && typeof behavior === 'object') sidePanelBehavior = { ...sidePanelBehavior, ...behavior };
    return undefined;
  });
  ensureAsyncMethod(sidePanel, 'getPanelBehavior', () => ({ ...sidePanelBehavior }));
  ensureAsyncMethod(sidePanel, 'open', () => undefined);

  // chrome.privacy
  const privacy = ensureNamespace('privacy');
  function makePrivacySetting(defaultValue) {
    let val = defaultValue;
    const onChange = makeEvent();
    return {
      get(_details, cb) {
        const res = { value: val, levelOfControl: 'controllable_by_this_extension' };
        if (typeof cb === 'function') {
          queueMicrotask(() => cb(res));
          return undefined;
        }
        return Promise.resolve(res);
      },
      set(details, cb) {
        if (details && typeof details === 'object' && 'value' in details) {
          val = details.value;
          onChange.dispatch({ value: val, levelOfControl: 'controlled_by_this_extension' });
        }
        if (typeof cb === 'function') {
          queueMicrotask(() => cb());
          return undefined;
        }
        return Promise.resolve();
      },
      clear(_details, cb) {
        val = defaultValue;
        onChange.dispatch({ value: val, levelOfControl: 'controllable_by_this_extension' });
        if (typeof cb === 'function') {
          queueMicrotask(() => cb());
          return undefined;
        }
        return Promise.resolve();
      },
      onChange
    };
  }
  const privacyServices = ensureProp(privacy, 'services', () => ({}));
  ['passwordSavingEnabled', 'autofillEnabled', 'autofillAddressEnabled', 'autofillCreditCardEnabled'].forEach((k) => {
    ensureProp(privacyServices, k, () => makePrivacySetting(true));
  });
  const privacyNetwork = ensureProp(privacy, 'network', () => ({}));
  ensureProp(privacyNetwork, 'networkPredictionEnabled', () => makePrivacySetting(true));
  ensureProp(privacyNetwork, 'webRTCIPHandlingPolicy', () => makePrivacySetting('default'));
  const privacyWebsites = ensureProp(privacy, 'websites', () => ({}));
  ['hyperlinkAuditingEnabled', 'referrersEnabled', 'thirdPartyCookiesAllowed'].forEach((k) => {
    ensureProp(privacyWebsites, k, () => makePrivacySetting(true));
  });

  // chrome.idle
  const idle = ensureNamespace('idle');
  let idleDetectionInterval = 60;
  ensureEvent(idle, 'onStateChanged');
  ensureAsyncMethod(idle, 'queryState', () => 'active');
  ensureAsyncMethod(idle, 'getAutoLockDelay', () => 0);
  if (typeof idle.setDetectionInterval === 'undefined') {
    idle.setDetectionInterval = (intervalInSeconds) => {
      if (typeof intervalInSeconds === 'number' && intervalInSeconds >= 15) {
        idleDetectionInterval = intervalInSeconds;
      }
      return idleDetectionInterval;
    };
  }

  // chrome.commands
  const commands = ensureNamespace('commands');
  ensureEvent(commands, 'onCommand');
  ensureAsyncMethod(commands, 'getAll', () => []);

  // chrome.offscreen
  const offscreen = ensureNamespace('offscreen');
  let hasOffscreenDoc = false;
  ensureProp(offscreen, 'Reason', () => ({
    TESTING: 'TESTING',
    AUDIO_PLAYBACK: 'AUDIO_PLAYBACK',
    IFRAME_SCRIPTING: 'IFRAME_SCRIPTING',
    DOM_SCRAPING: 'DOM_SCRAPING',
    BLOBS: 'BLOBS',
    DOM_PARSER: 'DOM_PARSER',
    USER_MEDIA: 'USER_MEDIA',
    DISPLAY_MEDIA: 'DISPLAY_MEDIA',
    WEB_RTC: 'WEB_RTC',
    CLIPBOARD: 'CLIPBOARD',
    LOCAL_STORAGE: 'LOCAL_STORAGE',
    WORKERS: 'WORKERS',
    BATTERY_STATUS: 'BATTERY_STATUS',
    MATCH_MEDIA: 'MATCH_MEDIA',
    GEOLOCATION: 'GEOLOCATION'
  }));
  ensureAsyncMethod(offscreen, 'createDocument', () => {
    hasOffscreenDoc = true;
    return undefined;
  });
  ensureAsyncMethod(offscreen, 'closeDocument', () => {
    hasOffscreenDoc = false;
    return undefined;
  });
  ensureAsyncMethod(offscreen, 'hasDocument', () => hasOffscreenDoc);

  // chrome.permissions
  const permissions = ensureNamespace('permissions');
  ensureEvent(permissions, 'onAdded');
  ensureEvent(permissions, 'onRemoved');
  ensureAsyncMethod(permissions, 'contains', () => true);
  ensureAsyncMethod(permissions, 'request', () => true);
  ensureAsyncMethod(permissions, 'remove', () => true);
  ensureAsyncMethod(permissions, 'getAll', () => {
    try {
      const m = typeof runtime.getManifest === 'function' ? runtime.getManifest() : {};
      return {
        permissions: Array.isArray(m?.permissions) ? m.permissions : [],
        origins: Array.isArray(m?.host_permissions) ? m.host_permissions : []
      };
    } catch (_) {
      return { permissions: [], origins: [] };
    }
  });

  // chrome.storage.session (preserve native storage.local/sync/onChanged)
  const storage = ensureNamespace('storage');
  ensureEvent(storage, 'onChanged');
  if (!storage.session || typeof storage.session !== 'object') {
    const sessionData = new Map();
    const sessionChanged = makeEvent();
    const cloneVal = (v) => {
      try {
        return typeof structuredClone === 'function' ? structuredClone(v) : JSON.parse(JSON.stringify(v));
      } catch (_) {
        return v;
      }
    };
    storage.session = {
      QUOTA_BYTES: 10485760,
      onChanged: sessionChanged,
      get(keys, cb) {
        return resolveWithCallback(() => {
          const out = {};
          if (keys === null || typeof keys === 'undefined') {
            for (const [k, v] of sessionData.entries()) out[k] = cloneVal(v);
          } else if (typeof keys === 'string') {
            if (sessionData.has(keys)) out[keys] = cloneVal(sessionData.get(keys));
          } else if (Array.isArray(keys)) {
            for (const k of keys) {
              if (sessionData.has(k)) out[k] = cloneVal(sessionData.get(k));
            }
          } else if (typeof keys === 'object') {
            for (const k of Object.keys(keys)) {
              out[k] = sessionData.has(k) ? cloneVal(sessionData.get(k)) : keys[k];
            }
          }
          return out;
        }, typeof cb === 'function' ? [cb] : []);
      },
      set(items, cb) {
        return resolveWithCallback(() => {
          if (!items || typeof items !== 'object') return undefined;
          const changes = {};
          for (const k of Object.keys(items)) {
            const oldValue = sessionData.has(k) ? cloneVal(sessionData.get(k)) : undefined;
            const newValue = cloneVal(items[k]);
            sessionData.set(k, newValue);
            changes[k] = { oldValue, newValue };
          }
          if (Object.keys(changes).length > 0) {
            sessionChanged.dispatch(changes, 'session');
            storage.onChanged?.dispatch?.(changes, 'session');
          }
          return undefined;
        }, typeof cb === 'function' ? [cb] : []);
      },
      remove(keys, cb) {
        return resolveWithCallback(() => {
          const arr = Array.isArray(keys) ? keys : [keys];
          const changes = {};
          for (const k of arr) {
            if (sessionData.has(k)) {
              changes[k] = { oldValue: cloneVal(sessionData.get(k)), newValue: undefined };
              sessionData.delete(k);
            }
          }
          if (Object.keys(changes).length > 0) {
            sessionChanged.dispatch(changes, 'session');
            storage.onChanged?.dispatch?.(changes, 'session');
          }
          return undefined;
        }, typeof cb === 'function' ? [cb] : []);
      },
      clear(cb) {
        return resolveWithCallback(() => {
          const changes = {};
          for (const [k, v] of sessionData.entries()) {
            changes[k] = { oldValue: cloneVal(v), newValue: undefined };
          }
          sessionData.clear();
          if (Object.keys(changes).length > 0) {
            sessionChanged.dispatch(changes, 'session');
            storage.onChanged?.dispatch?.(changes, 'session');
          }
          return undefined;
        }, typeof cb === 'function' ? [cb] : []);
      },
      getBytesInUse(keys, cb) {
        const callback = typeof keys === 'function' ? keys : cb;
        return resolveWithCallback(() => {
          let total = 0;
          for (const [k, v] of sessionData.entries()) {
            if (!keys || typeof keys === 'function' || keys === k || (Array.isArray(keys) && keys.includes(k))) {
              total += String(k).length + JSON.stringify(v ?? null).length;
            }
          }
          return total;
        }, typeof callback === 'function' ? [callback] : []);
      },
      setAccessLevel(_accessOptions, cb) {
        return resolveWithCallback(() => undefined, typeof cb === 'function' ? [cb] : []);
      }
    };
  }

  // chrome.alarms (timer-backed)
  const alarms = ensureNamespace('alarms');
  const alarmEvent = ensureEvent(alarms, 'onAlarm');
  const alarmStore = new Map();
  const alarmTimers = new Map();
  function clearAlarmTimer(name) {
    const t = alarmTimers.get(name);
    if (t) {
      clearTimeout(t);
      clearInterval(t);
      alarmTimers.delete(name);
    }
  }
  function scheduleAlarm(name, info) {
    clearAlarmTimer(name);
    const delayMs = Math.max(0, (info.scheduledTime || Date.now()) - Date.now());
    const timer = setTimeout(() => {
      const current = alarmStore.get(name);
      if (!current) return;
      alarmEvent.dispatch({ ...current });
      if (current.periodInMinutes && current.periodInMinutes > 0) {
        current.scheduledTime = Date.now() + current.periodInMinutes * 60000;
        scheduleAlarm(name, current);
      } else {
        alarmStore.delete(name);
        alarmTimers.delete(name);
      }
    }, Math.min(delayMs, 2147483647));
    alarmTimers.set(name, timer);
  }
  if (typeof alarms.create === 'undefined') {
    alarms.create = function (nameOrInfo, alarmInfo) {
      let name = '';
      let info = alarmInfo;
      if (typeof nameOrInfo === 'string') {
        name = nameOrInfo;
      } else {
        info = nameOrInfo || {};
      }
      info = info || {};
      const periodInMinutes = typeof info.periodInMinutes === 'number' ? info.periodInMinutes : undefined;
      let scheduledTime = Date.now();
      if (typeof info.when === 'number') {
        scheduledTime = info.when;
      } else if (typeof info.delayInMinutes === 'number') {
        scheduledTime = Date.now() + info.delayInMinutes * 60000;
      } else if (typeof periodInMinutes === 'number') {
        scheduledTime = Date.now() + periodInMinutes * 60000;
      }
      const entry = { name, scheduledTime, periodInMinutes };
      alarmStore.set(name, entry);
      scheduleAlarm(name, entry);
      return Promise.resolve();
    };
  }
  ensureAsyncMethod(alarms, 'get', (name) => {
    const k = typeof name === 'string' ? name : '';
    return alarmStore.has(k) ? { ...alarmStore.get(k) } : undefined;
  });
  ensureAsyncMethod(alarms, 'getAll', () => Array.from(alarmStore.values()).map((a) => ({ ...a })));
  ensureAsyncMethod(alarms, 'clear', (name) => {
    const k = typeof name === 'string' ? name : '';
    clearAlarmTimer(k);
    return alarmStore.delete(k);
  });
  ensureAsyncMethod(alarms, 'clearAll', () => {
    for (const k of Array.from(alarmTimers.keys())) clearAlarmTimer(k);
    alarmStore.clear();
    return true;
  });

  // chrome.contextMenus
  const contextMenus = ensureNamespace('contextMenus');
  ensureEvent(contextMenus, 'onClicked');
  if (typeof contextMenus.create === 'undefined') {
    contextMenus.create = function (createProperties, cb) {
      const id = createProperties?.id || `menu_${Math.random().toString(36).slice(2, 10)}`;
      callBridge('contextMenus.create', [{ ...(createProperties || {}), id }])
        .then(() => { if (typeof cb === 'function') cb(); })
        .catch(() => { if (typeof cb === 'function') cb(); });
      return id;
    };
  }
  bindBridgeMethod(contextMenus, 'update', 'contextMenus.update', () => undefined);
  bindBridgeMethod(contextMenus, 'remove', 'contextMenus.remove', () => undefined);
  bindBridgeMethod(contextMenus, 'removeAll', 'contextMenus.removeAll', () => undefined);

  // chrome.notifications
  const notifications = ensureNamespace('notifications');
  ensureEvent(notifications, 'onClicked');
  ensureEvent(notifications, 'onClosed');
  ensureEvent(notifications, 'onButtonClicked');
  bindBridgeMethod(notifications, 'create', 'notifications.create', (id) => (typeof id === 'string' && id ? id : `notif_${Date.now()}`));
  ensureAsyncMethod(notifications, 'update', () => true);
  bindBridgeMethod(notifications, 'clear', 'notifications.clear', () => true);
  ensureAsyncMethod(notifications, 'getAll', () => ({}));

  // chrome.action & chrome.browserAction
  ['action', 'browserAction'].forEach((nsName) => {
    const act = ensureNamespace(nsName);
    ensureEvent(act, 'onClicked');
    bindBridgeMethod(act, 'setBadgeText', 'action.setBadgeText', () => undefined);
    bindBridgeMethod(act, 'getBadgeText', 'action.getBadgeText', () => '');
    bindBridgeMethod(act, 'setBadgeBackgroundColor', 'action.setBadgeBackgroundColor', () => undefined);
    ensureAsyncMethod(act, 'getBadgeBackgroundColor', () => [0, 0, 0, 0]);
    bindBridgeMethod(act, 'setBadgeTextColor', 'action.setBadgeTextColor', () => undefined);
    bindBridgeMethod(act, 'setTitle', 'action.setTitle', () => undefined);
    ensureAsyncMethod(act, 'getTitle', () => '');
    ensureAsyncMethod(act, 'setIcon', () => undefined);
    bindBridgeMethod(act, 'setPopup', 'action.setPopup', () => undefined);
    bindBridgeMethod(act, 'getPopup', 'action.getPopup', () => '');
    ensureAsyncMethod(act, 'enable', () => undefined);
    ensureAsyncMethod(act, 'disable', () => undefined);
    ensureAsyncMethod(act, 'openPopup', () => undefined);
  });

  // chrome.tabs (bridge query/get/create/update/remove/reload to QBrowse; preserve native sendMessage/connect)
  const tabs = ensureNamespace('tabs');
  const origTabsQuery = typeof tabs.query === 'function' ? tabs.query.bind(tabs) : null;
  const origTabsGet = typeof tabs.get === 'function' ? tabs.get.bind(tabs) : null;
  [
    'onCreated',
    'onUpdated',
    'onRemoved',
    'onActivated',
    'onReplaced',
    'onMoved',
    'onDetached',
    'onAttached',
    'onHighlighted',
    'onZoomChange'
  ].forEach((ev) => ensureEvent(tabs, ev));
  bindBridgeMethod(tabs, 'query', 'tabs.query', (q) => (origTabsQuery ? origTabsQuery(q || {}) : []));
  bindBridgeMethod(tabs, 'get', 'tabs.get', (tabId) => (origTabsGet ? origTabsGet(tabId) : null));
  bindBridgeMethod(tabs, 'create', 'tabs.create', (props) => ({ id: Date.now(), url: props?.url || 'about:blank', active: props?.active !== false }));
  bindBridgeMethod(tabs, 'update', 'tabs.update', (tabId, props) => ({ id: tabId || 1, ...(props || {}) }));
  bindBridgeMethod(tabs, 'remove', 'tabs.remove', () => undefined);
  bindBridgeMethod(tabs, 'reload', 'tabs.reload', () => undefined);
  ensureAsyncMethod(tabs, 'duplicate', () => null);
  ensureAsyncMethod(tabs, 'discard', () => null);
  ensureAsyncMethod(tabs, 'getZoom', () => 1);
  ensureAsyncMethod(tabs, 'setZoom', () => undefined);
  ensureAsyncMethod(tabs, 'detectLanguage', () => 'en');
  ensureAsyncMethod(tabs, 'captureVisibleTab', () => '');
  ensureAsyncMethod(tabs, 'sendMessage', () => undefined);
  if (typeof tabs.connect === 'undefined') {
    tabs.connect = () => ({
      name: '',
      postMessage() {},
      disconnect() {},
      onMessage: makeEvent(),
      onDisconnect: makeEvent()
    });
  }

  // chrome.windows
  const windowsNs = ensureNamespace('windows');
  ensureProp(windowsNs, 'WINDOW_ID_NONE', -1);
  ensureProp(windowsNs, 'WINDOW_ID_CURRENT', -2);
  ['onCreated', 'onRemoved', 'onFocusChanged', 'onBoundsChanged'].forEach((ev) => ensureEvent(windowsNs, ev));
  ensureAsyncMethod(windowsNs, 'get', (id) => ({ id: id || 1, focused: true, type: 'normal', state: 'normal' }));
  bindBridgeMethod(windowsNs, 'getCurrent', 'windows.getCurrent', () => ({ id: 1, focused: true, type: 'normal', state: 'normal' }));
  bindBridgeMethod(windowsNs, 'getLastFocused', 'windows.getLastFocused', () => ({ id: 1, focused: true, type: 'normal', state: 'normal' }));
  bindBridgeMethod(windowsNs, 'getAll', 'windows.getAll', () => [{ id: 1, focused: true, type: 'normal', state: 'normal', tabs: [] }]);
  bindBridgeMethod(windowsNs, 'create', 'windows.create', () => ({ id: Date.now(), focused: true, type: 'normal', state: 'normal' }));
  ensureAsyncMethod(windowsNs, 'update', (id) => ({ id: id || 1, focused: true, type: 'normal', state: 'normal' }));
  ensureAsyncMethod(windowsNs, 'remove', () => undefined);

  // chrome.tabGroups
  const tabGroups = ensureNamespace('tabGroups');
  ensureProp(tabGroups, 'TAB_GROUP_ID_NONE', -1);
  ['onCreated', 'onUpdated', 'onRemoved', 'onMoved'].forEach((ev) => ensureEvent(tabGroups, ev));
  ensureAsyncMethod(tabGroups, 'get', () => null);
  ensureAsyncMethod(tabGroups, 'query', () => []);
  ensureAsyncMethod(tabGroups, 'update', () => null);
  ensureAsyncMethod(tabGroups, 'move', () => null);

  // chrome.userScripts
  const userScripts = ensureNamespace('userScripts');
  ensureAsyncMethod(userScripts, 'register', () => undefined);
  ensureAsyncMethod(userScripts, 'unregister', () => undefined);
  ensureAsyncMethod(userScripts, 'update', () => undefined);
  ensureAsyncMethod(userScripts, 'getScripts', () => []);
  ensureAsyncMethod(userScripts, 'configureWorld', () => undefined);

  // chrome.declarativeContent
  const declarativeContent = ensureNamespace('declarativeContent');
  if (!declarativeContent.onPageChanged) {
    let rules = [];
    const base = makeEvent();
    base.addRules = function (newRules, cb) {
      if (Array.isArray(newRules)) rules = rules.concat(newRules);
      return resolveWithCallback(() => rules, typeof cb === 'function' ? [cb] : []);
    };
    base.removeRules = function (ruleIds, cb) {
      if (!ruleIds) rules = [];
      else if (Array.isArray(ruleIds)) rules = rules.filter((r) => !ruleIds.includes(r.id));
      return resolveWithCallback(() => undefined, typeof cb === 'function' ? [cb] : []);
    };
    base.getRules = function (_ruleIds, cb) {
      const callback = typeof _ruleIds === 'function' ? _ruleIds : cb;
      return resolveWithCallback(() => rules.slice(), typeof callback === 'function' ? [callback] : []);
    };
    declarativeContent.onPageChanged = base;
  }
  ensureProp(declarativeContent, 'PageStateMatcher', () => function PageStateMatcher(opts) { Object.assign(this, opts); });
  ensureProp(declarativeContent, 'ShowAction', () => function ShowAction() {});
  ensureProp(declarativeContent, 'ShowPageAction', () => function ShowPageAction() {});

  // chrome.identity
  const identity = ensureNamespace('identity');
  ensureEvent(identity, 'onSignInChanged');
  if (typeof identity.getRedirectURL === 'undefined') {
    identity.getRedirectURL = (p) => `https://${runtime.id || 'extension'}.chromiumapp.org/${String(p || '').replace(/^\/+/, '')}`;
  }
  ensureAsyncMethod(identity, 'launchWebAuthFlow', () => '');
  ensureAsyncMethod(identity, 'getProfileUserInfo', () => ({ email: '', id: '' }));
  ensureAsyncMethod(identity, 'getAuthToken', () => undefined);
  ensureAsyncMethod(identity, 'removeCachedAuthToken', () => undefined);

  // chrome.management
  const management = ensureNamespace('management');
  ['onInstalled', 'onUninstalled', 'onEnabled', 'onDisabled'].forEach((ev) => ensureEvent(management, ev));
  ensureAsyncMethod(management, 'getSelf', () => ({ id: runtime.id || '', enabled: true, installType: 'normal' }));
  ensureAsyncMethod(management, 'getAll', () => []);
  ensureAsyncMethod(management, 'get', () => null);

  // chrome.sessions
  const sessions = ensureNamespace('sessions');
  ensureEvent(sessions, 'onChanged');
  ensureAsyncMethod(sessions, 'getRecentlyClosed', () => []);
  ensureAsyncMethod(sessions, 'getDevices', () => []);
  ensureAsyncMethod(sessions, 'restore', () => null);

  // chrome.browsingData
  const browsingData = ensureNamespace('browsingData');
  ensureAsyncMethod(browsingData, 'remove', () => undefined);
  ensureAsyncMethod(browsingData, 'settings', () => ({ options: {}, dataToRemove: {}, dataRemovalPermitted: {} }));

  // chrome.history
  const historyNs = ensureNamespace('history');
  ensureEvent(historyNs, 'onVisited');
  ensureEvent(historyNs, 'onVisitRemoved');
  ensureAsyncMethod(historyNs, 'search', () => []);
  ensureAsyncMethod(historyNs, 'getVisits', () => []);
  ensureAsyncMethod(historyNs, 'addUrl', () => undefined);
  ensureAsyncMethod(historyNs, 'deleteUrl', () => undefined);
  ensureAsyncMethod(historyNs, 'deleteRange', () => undefined);
  ensureAsyncMethod(historyNs, 'deleteAll', () => undefined);

  // chrome.bookmarks
  const bookmarks = ensureNamespace('bookmarks');
  ['onCreated', 'onRemoved', 'onChanged', 'onMoved'].forEach((ev) => ensureEvent(bookmarks, ev));
  ensureAsyncMethod(bookmarks, 'get', () => []);
  ensureAsyncMethod(bookmarks, 'getTree', () => []);
  ensureAsyncMethod(bookmarks, 'getChildren', () => []);
  ensureAsyncMethod(bookmarks, 'search', () => []);
  ensureAsyncMethod(bookmarks, 'create', () => ({ id: '1', title: '' }));
  ensureAsyncMethod(bookmarks, 'update', () => ({ id: '1', title: '' }));
  ensureAsyncMethod(bookmarks, 'move', () => ({ id: '1', title: '' }));
  ensureAsyncMethod(bookmarks, 'remove', () => undefined);

  // chrome.downloads
  const downloads = ensureNamespace('downloads');
  ['onCreated', 'onChanged', 'onErased'].forEach((ev) => ensureEvent(downloads, ev));
  ensureAsyncMethod(downloads, 'download', () => 1);
  ensureAsyncMethod(downloads, 'search', () => []);
  ensureAsyncMethod(downloads, 'pause', () => undefined);
  ensureAsyncMethod(downloads, 'resume', () => undefined);
  ensureAsyncMethod(downloads, 'cancel', () => undefined);
  ensureAsyncMethod(downloads, 'erase', () => []);
  ensureAsyncMethod(downloads, 'open', () => undefined);
  ensureAsyncMethod(downloads, 'show', () => undefined);

  // chrome.omnibox
  const omnibox = ensureNamespace('omnibox');
  ['onInputStarted', 'onInputChanged', 'onInputEntered', 'onInputCancelled'].forEach((ev) => ensureEvent(omnibox, ev));
  if (typeof omnibox.setDefaultSuggestion === 'undefined') {
    omnibox.setDefaultSuggestion = () => undefined;
  }

  // chrome.webRequest & chrome.webRequestAuthProvider
  const webRequest = ensureNamespace('webRequest');
  [
    'onBeforeRequest',
    'onBeforeSendHeaders',
    'onSendHeaders',
    'onHeadersReceived',
    'onAuthRequired',
    'onResponseStarted',
    'onBeforeRedirect',
    'onCompleted',
    'onErrorOccurred'
  ].forEach((ev) => ensureEvent(webRequest, ev));
  ensureAsyncMethod(webRequest, 'handlerBehaviorChanged', () => undefined);

  const webRequestAuthProvider = ensureNamespace('webRequestAuthProvider');
  ensureEvent(webRequestAuthProvider, 'onAuthRequired');

  // chrome.scripting
  const scripting = ensureNamespace('scripting');
  if (typeof scripting.registerContentScripts === 'function') {
    const origRegisterContentScripts = scripting.registerContentScripts.bind(scripting);
    scripting.registerContentScripts = function (scripts, cb) {
      const invokeOrig = () => new Promise((resolve, reject) => {
        try {
          const maybePromise = origRegisterContentScripts(scripts);
          if (maybePromise && typeof maybePromise.then === 'function') {
            maybePromise.then(resolve, reject);
          } else {
            resolve(maybePromise);
          }
        } catch (err) {
          reject(err);
        }
      });
      return resolveWithCallback(async () => {
        try {
          return await invokeOrig();
        } catch (err) {
          if (/Duplicate script ID/i.test(err?.message || String(err)) && typeof scripting.updateContentScripts === 'function') {
            return await scripting.updateContentScripts(scripts);
          }
          throw err;
        }
      }, typeof cb === 'function' ? [cb] : []);
    };
  }
  ensureAsyncMethod(scripting, 'executeScript', () => []);
  ensureAsyncMethod(scripting, 'insertCSS', () => undefined);
  ensureAsyncMethod(scripting, 'removeCSS', () => undefined);
  ensureAsyncMethod(scripting, 'registerContentScripts', () => undefined);
  ensureAsyncMethod(scripting, 'unregisterContentScripts', () => undefined);
  ensureAsyncMethod(scripting, 'updateContentScripts', () => undefined);
  ensureAsyncMethod(scripting, 'getRegisteredContentScripts', () => []);
})();
