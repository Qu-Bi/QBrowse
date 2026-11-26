(function () {
  'use strict';

  if (typeof window === 'undefined' || !window.location || window.location.protocol !== 'chrome-extension:') {
    return;
  }

  let ipcRenderer = null;
  try {
    const electron = require('electron');
    ipcRenderer = electron && electron.ipcRenderer ? electron.ipcRenderer : null;
  } catch (_) {
    ipcRenderer = null;
  }

  if (!window.chrome) window.chrome = {};
  const chromeObj = window.chrome;

  const eventListeners = {
    'action.onClicked': new Set(),
    'browserAction.onClicked': new Set(),
    'contextMenus.onClicked': new Set()
  };

  function makeEvent(name, withRules = false) {
    const set = eventListeners[name] || (eventListeners[name] = new Set());
    const ev = {
      addListener(fn) {
        if (typeof fn === 'function') set.add(fn);
      },
      removeListener(fn) {
        set.delete(fn);
      },
      hasListener(fn) {
        return set.has(fn);
      },
      hasListeners() {
        return set.size > 0;
      }
    };
    if (withRules) {
      ev.addRules = function (rules, cb) {
        return callLocal(() => rules || [], [cb]);
      };
      ev.removeRules = function (_ruleIdentifiers, cb) {
        return callLocal(() => undefined, [cb]);
      };
      ev.getRules = function (_ruleIdentifiers, cb) {
        return callLocal(() => [], [cb]);
      };
    }
    return ev;
  }

  function emitLocalEvent(name, ...args) {
    const set = eventListeners[name];
    if (!set) return;
    for (const fn of set) {
      try {
        fn(...args);
      } catch (_) {}
    }
  }

  try {
    if (ipcRenderer && typeof ipcRenderer.on === 'function') {
      ipcRenderer.on('qbrowse-ext-event', (_event, payload) => {
        try {
          const eventName = payload && payload.eventName;
          const args = Array.isArray(payload && payload.args) ? payload.args : [];
          if (!eventName) return;
          const targets = [eventName];
          if (eventName === 'action.onClicked') targets.push('browserAction.onClicked');
          for (const target of targets) {
            emitLocalEvent(target, ...args);
          }
        } catch (_) {}
      });
    }
  } catch (_) {}

  function invokeExtApi(method, args) {
    if (!ipcRenderer || typeof ipcRenderer.invoke !== 'function') {
      return Promise.reject(new Error('Extension IPC bridge unavailable'));
    }
    try {
      return ipcRenderer.invoke('qbrowse-ext-api', { method, args });
    } catch (err) {
      return Promise.reject(err);
    }
  }

  function wrapPromiseWithCallback(promise, maybeCb) {
    if (typeof maybeCb === 'function') {
      promise.then(
        (res) => {
          try {
            maybeCb(res);
          } catch (_) {}
        },
        (err) => {
          try {
            if (chromeObj.runtime) {
              chromeObj.runtime.lastError = { message: err && err.message ? err.message : String(err) };
            }
            maybeCb(undefined);
          } catch (_) {}
        }
      );
      return undefined;
    }
    return promise;
  }

  function callApi(method, rawArgs) {
    const args = Array.from(rawArgs);
    const maybeCb = args.length > 0 && typeof args[args.length - 1] === 'function' ? args.pop() : null;
    return wrapPromiseWithCallback(invokeExtApi(method, args), maybeCb);
  }

  function callLocal(fn, rawArgs) {
    const args = Array.from(rawArgs);
    const maybeCb = args.length > 0 && typeof args[args.length - 1] === 'function' ? args.pop() : null;
    let promise;
    try {
      promise = Promise.resolve(fn(...args));
    } catch (err) {
      promise = Promise.reject(err);
    }
    return wrapPromiseWithCallback(promise, maybeCb);
  }

  function installNamespace(nsName, methods = {}, extras = {}, localMethods = {}) {
    if (!chromeObj[nsName] || typeof chromeObj[nsName] !== 'object') {
      chromeObj[nsName] = {};
    }
    const target = chromeObj[nsName];
    for (const [fnName, ipcMethod] of Object.entries(methods)) {
      if (typeof target[fnName] !== 'function') {
        target[fnName] = function (...args) {
          return callApi(ipcMethod, args);
        };
      }
    }
    for (const [fnName, impl] of Object.entries(localMethods)) {
      if (typeof target[fnName] !== 'function') {
        target[fnName] = impl;
      }
    }
    for (const [k, v] of Object.entries(extras)) {
      if (target[k] === undefined) {
        target[k] = v;
      }
    }
    return target;
  }

  function makePort(name = '') {
    return {
      name,
      disconnect() {},
      postMessage() {},
      onDisconnect: makeEvent(`port.onDisconnect.${Math.random().toString(36).slice(2)}`),
      onMessage: makeEvent(`port.onMessage.${Math.random().toString(36).slice(2)}`)
    };
  }

  // --- tabs ---
  installNamespace(
    'tabs',
    {
      query: 'tabs.query',
      get: 'tabs.get',
      create: 'tabs.create',
      update: 'tabs.update',
      remove: 'tabs.remove',
      reload: 'tabs.reload'
    },
    {
      onCreated: makeEvent('tabs.onCreated'),
      onUpdated: makeEvent('tabs.onUpdated'),
      onRemoved: makeEvent('tabs.onRemoved'),
      onActivated: makeEvent('tabs.onActivated'),
      onReplaced: makeEvent('tabs.onReplaced'),
      onMoved: makeEvent('tabs.onMoved'),
      onDetached: makeEvent('tabs.onDetached'),
      onAttached: makeEvent('tabs.onAttached'),
      onHighlighted: makeEvent('tabs.onHighlighted'),
      onZoomChange: makeEvent('tabs.onZoomChange')
    },
    {
      sendMessage(...args) { return callLocal(() => undefined, args); },
      connect(_tabId, connectInfo) { return makePort(connectInfo && connectInfo.name ? String(connectInfo.name) : ''); },
      duplicate(...args) { return callLocal((tabId) => ({ id: tabId || 1 }), args); },
      discard(...args) { return callLocal((tabId) => ({ id: tabId || 1, discarded: true }), args); },
      getZoom(...args) { return callLocal(() => 1, args); },
      setZoom(...args) { return callLocal(() => undefined, args); },
      detectLanguage(...args) { return callLocal(() => 'und', args); },
      captureVisibleTab(...args) { return callLocal(() => '', args); }
    }
  );

  // --- windows ---
  installNamespace(
    'windows',
    {
      getCurrent: 'windows.getCurrent',
      getLastFocused: 'windows.getLastFocused',
      getAll: 'windows.getAll',
      create: 'windows.create',
      update: 'windows.update'
    },
    {
      WINDOW_ID_NONE: -1,
      WINDOW_ID_CURRENT: -2,
      onCreated: makeEvent('windows.onCreated'),
      onRemoved: makeEvent('windows.onRemoved'),
      onFocusChanged: makeEvent('windows.onFocusChanged'),
      onBoundsChanged: makeEvent('windows.onBoundsChanged')
    }
  );

  // --- action & browserAction ---
  const actionMethods = {
    setBadgeText: 'action.setBadgeText',
    getBadgeText: 'action.getBadgeText',
    setBadgeBackgroundColor: 'action.setBadgeBackgroundColor',
    setBadgeTextColor: 'action.setBadgeTextColor',
    setTitle: 'action.setTitle',
    setPopup: 'action.setPopup',
    getPopup: 'action.getPopup'
  };
  installNamespace('action', actionMethods, { onClicked: makeEvent('action.onClicked') });
  installNamespace('browserAction', actionMethods, { onClicked: makeEvent('browserAction.onClicked') });

  // --- cookies ---
  installNamespace('cookies', {
    get: 'cookies.get',
    getAll: 'cookies.getAll',
    set: 'cookies.set',
    remove: 'cookies.remove'
  });

  // --- contextMenus ---
  if (!chromeObj.contextMenus || typeof chromeObj.contextMenus !== 'object') {
    chromeObj.contextMenus = {};
  }
  if (typeof chromeObj.contextMenus.create !== 'function') {
    chromeObj.contextMenus.create = function (createProperties, callback) {
      const props = createProperties && typeof createProperties === 'object' ? { ...createProperties } : {};
      const id = String(props.id || `menu_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
      props.id = id;
      invokeExtApi('contextMenus.create', [props]).then(
        () => {
          if (typeof callback === 'function') {
            try { callback(); } catch (_) {}
          }
        },
        (err) => {
          if (typeof callback === 'function') {
            try {
              if (chromeObj.runtime) {
                chromeObj.runtime.lastError = { message: err && err.message ? err.message : String(err) };
              }
              callback();
            } catch (_) {}
          }
        }
      );
      return id;
    };
  }
  installNamespace(
    'contextMenus',
    {
      update: 'contextMenus.update',
      remove: 'contextMenus.remove',
      removeAll: 'contextMenus.removeAll'
    },
    { onClicked: makeEvent('contextMenus.onClicked') }
  );

  // --- notifications ---
  installNamespace(
    'notifications',
    { create: 'notifications.create' },
    {
      onClicked: makeEvent('notifications.onClicked'),
      onClosed: makeEvent('notifications.onClosed'),
      onButtonClicked: makeEvent('notifications.onButtonClicked')
    },
    {
      update(...args) { return callLocal(() => false, args); },
      clear(...args) { return callLocal(() => false, args); },
      getAll(...args) { return callLocal(() => ({}), args); }
    }
  );

  // --- runtime ---
  const platformOs = (typeof process !== 'undefined' && process.platform)
    ? (process.platform === 'darwin' ? 'mac' : process.platform === 'win32' ? 'win' : 'linux')
    : 'win';
  installNamespace(
    'runtime',
    { openOptionsPage: 'runtime.openOptionsPage' },
    {
      onInstalled: makeEvent('runtime.onInstalled'),
      onStartup: makeEvent('runtime.onStartup'),
      onSuspend: makeEvent('runtime.onSuspend'),
      onSuspendCanceled: makeEvent('runtime.onSuspendCanceled'),
      onUpdateAvailable: makeEvent('runtime.onUpdateAvailable'),
      onMessage: makeEvent('runtime.onMessage'),
      onConnect: makeEvent('runtime.onConnect'),
      onMessageExternal: makeEvent('runtime.onMessageExternal'),
      onConnectExternal: makeEvent('runtime.onConnectExternal')
    },
    {
      setUninstallURL(...args) { return callLocal(() => undefined, args); },
      getPlatformInfo(...args) { return callLocal(() => ({ os: platformOs, arch: 'x86-64', nacl_arch: 'x86-64' }), args); },
      getBrowserInfo(...args) { return callLocal(() => ({ name: 'QBrowse', vendor: 'QBrowse', version: '1.0.0', buildID: '' }), args); },
      getContexts(...args) { return callLocal(() => [], args); }
    }
  );

  // --- webNavigation ---
  installNamespace(
    'webNavigation',
    {},
    {
      onBeforeNavigate: makeEvent('webNavigation.onBeforeNavigate'),
      onCommitted: makeEvent('webNavigation.onCommitted'),
      onDOMContentLoaded: makeEvent('webNavigation.onDOMContentLoaded'),
      onCompleted: makeEvent('webNavigation.onCompleted'),
      onErrorOccurred: makeEvent('webNavigation.onErrorOccurred'),
      onHistoryStateUpdated: makeEvent('webNavigation.onHistoryStateUpdated'),
      onReferenceFragmentUpdated: makeEvent('webNavigation.onReferenceFragmentUpdated'),
      onTabReplaced: makeEvent('webNavigation.onTabReplaced'),
      onCreatedNavigationTarget: makeEvent('webNavigation.onCreatedNavigationTarget')
    },
    {
      getFrame(...args) { return callLocal(() => null, args); },
      getAllFrames(...args) { return callLocal(() => [], args); }
    }
  );

  // --- sidePanel ---
  let sidePanelOptions = { enabled: true };
  let sidePanelBehavior = { openPanelOnActionClick: false };
  installNamespace(
    'sidePanel',
    {},
    {},
    {
      setOptions(...args) {
        return callLocal((opts) => {
          if (opts && typeof opts === 'object') sidePanelOptions = { ...sidePanelOptions, ...opts };
          return undefined;
        }, args);
      },
      getOptions(...args) { return callLocal(() => ({ ...sidePanelOptions }), args); },
      setPanelBehavior(...args) {
        return callLocal((behavior) => {
          if (behavior && typeof behavior === 'object') sidePanelBehavior = { ...sidePanelBehavior, ...behavior };
          return undefined;
        }, args);
      },
      getPanelBehavior(...args) { return callLocal(() => ({ ...sidePanelBehavior }), args); },
      open(...args) { return callLocal(() => undefined, args); }
    }
  );

  // --- privacy ---
  function makePrivacySetting(key, defaultValue) {
    let currentValue = defaultValue;
    const onChange = makeEvent(`privacy.${key}.onChange`);
    return {
      get(...args) {
        return callLocal(() => ({
          value: currentValue,
          levelOfControl: 'controllable_by_this_extension'
        }), args);
      },
      set(...args) {
        return callLocal((details) => {
          if (details && 'value' in details) {
            currentValue = details.value;
            emitLocalEvent(`privacy.${key}.onChange`, {
              value: currentValue,
              levelOfControl: 'controlled_by_this_extension'
            });
          }
          return undefined;
        }, args);
      },
      clear(...args) {
        return callLocal(() => {
          currentValue = defaultValue;
          emitLocalEvent(`privacy.${key}.onChange`, {
            value: currentValue,
            levelOfControl: 'controllable_by_this_extension'
          });
          return undefined;
        }, args);
      },
      onChange
    };
  }
  const privacyNs = installNamespace('privacy', {}, {});
  if (!privacyNs.services || typeof privacyNs.services !== 'object') privacyNs.services = {};
  for (const [k, def] of [
    ['passwordSavingEnabled', true],
    ['autofillEnabled', true],
    ['autofillAddressEnabled', true],
    ['autofillCreditCardEnabled', true]
  ]) {
    if (privacyNs.services[k] === undefined) privacyNs.services[k] = makePrivacySetting(`services.${k}`, def);
  }
  if (!privacyNs.network || typeof privacyNs.network !== 'object') privacyNs.network = {};
  for (const [k, def] of [
    ['networkPredictionEnabled', true],
    ['webRTCIPHandlingPolicy', 'default']
  ]) {
    if (privacyNs.network[k] === undefined) privacyNs.network[k] = makePrivacySetting(`network.${k}`, def);
  }
  if (!privacyNs.websites || typeof privacyNs.websites !== 'object') privacyNs.websites = {};
  for (const [k, def] of [
    ['hyperlinkAuditingEnabled', true],
    ['referrersEnabled', true],
    ['thirdPartyCookiesAllowed', true]
  ]) {
    if (privacyNs.websites[k] === undefined) privacyNs.websites[k] = makePrivacySetting(`websites.${k}`, def);
  }

  // --- idle ---
  installNamespace(
    'idle',
    {},
    { onStateChanged: makeEvent('idle.onStateChanged') },
    {
      queryState(...args) { return callLocal(() => 'active', args); },
      setDetectionInterval() {},
      getAutoLockDelay(...args) { return callLocal(() => 0, args); }
    }
  );

  // --- commands ---
  installNamespace(
    'commands',
    {},
    { onCommand: makeEvent('commands.onCommand') },
    {
      getAll(...args) { return callLocal(() => [], args); }
    }
  );

  // --- offscreen ---
  let offscreenHasDoc = false;
  installNamespace(
    'offscreen',
    {},
    {
      Reason: {
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
      }
    },
    {
      createDocument(...args) { return callLocal(() => { offscreenHasDoc = true; return undefined; }, args); },
      closeDocument(...args) { return callLocal(() => { offscreenHasDoc = false; return undefined; }, args); },
      hasDocument(...args) { return callLocal(() => offscreenHasDoc, args); }
    }
  );

  // --- permissions ---
  installNamespace(
    'permissions',
    {},
    {
      onAdded: makeEvent('permissions.onAdded'),
      onRemoved: makeEvent('permissions.onRemoved')
    },
    {
      contains(...args) { return callLocal(() => true, args); },
      request(...args) { return callLocal(() => true, args); },
      remove(...args) { return callLocal(() => true, args); },
      getAll(...args) { return callLocal(() => ({ permissions: [], origins: [] }), args); }
    }
  );

  // --- storage.session ---
  const sessionStore = new Map();
  const storageNs = installNamespace('storage', {}, { onChanged: makeEvent('storage.onChanged') });
  if (!storageNs.session || typeof storageNs.session !== 'object') {
    storageNs.session = {
      onChanged: makeEvent('storage.session.onChanged'),
      get(...args) {
        return callLocal((keys) => {
          const out = {};
          if (keys === undefined || keys === null) {
            for (const [k, v] of sessionStore.entries()) out[k] = v;
            return out;
          }
          if (typeof keys === 'string') {
            if (sessionStore.has(keys)) out[keys] = sessionStore.get(keys);
            return out;
          }
          if (Array.isArray(keys)) {
            for (const k of keys) {
              if (sessionStore.has(k)) out[k] = sessionStore.get(k);
            }
            return out;
          }
          if (typeof keys === 'object') {
            for (const [k, defVal] of Object.entries(keys)) {
              out[k] = sessionStore.has(k) ? sessionStore.get(k) : defVal;
            }
            return out;
          }
          return out;
        }, args);
      },
      set(...args) {
        return callLocal((items) => {
          if (!items || typeof items !== 'object') return undefined;
          const changes = {};
          for (const [k, v] of Object.entries(items)) {
            const oldValue = sessionStore.get(k);
            sessionStore.set(k, v);
            changes[k] = { oldValue, newValue: v };
          }
          emitLocalEvent('storage.session.onChanged', changes);
          emitLocalEvent('storage.onChanged', changes, 'session');
          return undefined;
        }, args);
      },
      remove(...args) {
        return callLocal((keys) => {
          const list = Array.isArray(keys) ? keys : [keys];
          const changes = {};
          for (const k of list) {
            if (sessionStore.has(k)) {
              changes[k] = { oldValue: sessionStore.get(k) };
              sessionStore.delete(k);
            }
          }
          if (Object.keys(changes).length > 0) {
            emitLocalEvent('storage.session.onChanged', changes);
            emitLocalEvent('storage.onChanged', changes, 'session');
          }
          return undefined;
        }, args);
      },
      clear(...args) {
        return callLocal(() => {
          const changes = {};
          for (const [k, v] of sessionStore.entries()) {
            changes[k] = { oldValue: v };
          }
          sessionStore.clear();
          if (Object.keys(changes).length > 0) {
            emitLocalEvent('storage.session.onChanged', changes);
            emitLocalEvent('storage.onChanged', changes, 'session');
          }
          return undefined;
        }, args);
      },
      getBytesInUse(...args) {
        return callLocal((keys) => {
          let total = 0;
          const list = keys == null
            ? Array.from(sessionStore.keys())
            : (Array.isArray(keys) ? keys : [keys]);
          for (const k of list) {
            if (sessionStore.has(k)) {
              try {
                total += JSON.stringify(sessionStore.get(k)).length + String(k).length;
              } catch (_) {}
            }
          }
          return total;
        }, args);
      },
      setAccessLevel(...args) {
        return callLocal(() => undefined, args);
      }
    };
  }

  // --- alarms ---
  const alarmsMap = new Map();
  function clearAlarmTimer(rec) {
    if (!rec) return;
    if (rec.timeoutId) clearTimeout(rec.timeoutId);
    if (rec.intervalId) clearInterval(rec.intervalId);
  }
  installNamespace(
    'alarms',
    {},
    { onAlarm: makeEvent('alarms.onAlarm') },
    {
      create(nameOrInfo, alarmInfoOrCb, maybeCb) {
        let name = '';
        let info = {};
        let cb = null;
        if (typeof nameOrInfo === 'string') {
          name = nameOrInfo;
          if (typeof alarmInfoOrCb === 'function') {
            cb = alarmInfoOrCb;
          } else {
            info = alarmInfoOrCb || {};
            if (typeof maybeCb === 'function') cb = maybeCb;
          }
        } else {
          info = nameOrInfo || {};
          if (typeof alarmInfoOrCb === 'function') cb = alarmInfoOrCb;
        }
        const existing = alarmsMap.get(name);
        if (existing) clearAlarmTimer(existing);

        const now = Date.now();
        let delayMs = 60000;
        if (typeof info.when === 'number') {
          delayMs = Math.max(0, info.when - now);
        } else if (typeof info.delayInMinutes === 'number') {
          delayMs = Math.max(0, info.delayInMinutes * 60000);
        } else if (typeof info.periodInMinutes === 'number') {
          delayMs = Math.max(0, info.periodInMinutes * 60000);
        }
        const periodMs = typeof info.periodInMinutes === 'number' && info.periodInMinutes > 0
          ? info.periodInMinutes * 60000
          : null;

        const alarmObj = {
          name,
          scheduledTime: now + delayMs,
          ...(periodMs ? { periodInMinutes: info.periodInMinutes } : {})
        };
        const rec = { alarm: alarmObj, timeoutId: null, intervalId: null };
        rec.timeoutId = setTimeout(() => {
          emitLocalEvent('alarms.onAlarm', { ...rec.alarm });
          if (periodMs) {
            rec.intervalId = setInterval(() => {
              rec.alarm.scheduledTime = Date.now() + periodMs;
              emitLocalEvent('alarms.onAlarm', { ...rec.alarm });
            }, periodMs);
          } else {
            alarmsMap.delete(name);
          }
        }, delayMs);
        alarmsMap.set(name, rec);
        if (typeof cb === 'function') {
          try { cb(); } catch (_) {}
          return undefined;
        }
        return Promise.resolve();
      },
      get(...args) {
        return callLocal((name) => {
          const rec = alarmsMap.get(typeof name === 'string' ? name : '');
          return rec ? { ...rec.alarm } : undefined;
        }, args);
      },
      getAll(...args) {
        return callLocal(() => Array.from(alarmsMap.values()).map((r) => ({ ...r.alarm })), args);
      },
      clear(...args) {
        return callLocal((name) => {
          const key = typeof name === 'string' ? name : '';
          const rec = alarmsMap.get(key);
          if (!rec) return false;
          clearAlarmTimer(rec);
          alarmsMap.delete(key);
          return true;
        }, args);
      },
      clearAll(...args) {
        return callLocal(() => {
          for (const rec of alarmsMap.values()) clearAlarmTimer(rec);
          alarmsMap.clear();
          return true;
        }, args);
      }
    }
  );

  // --- tabGroups ---
  installNamespace(
    'tabGroups',
    {},
    {
      TAB_GROUP_ID_NONE: -1,
      onCreated: makeEvent('tabGroups.onCreated'),
      onUpdated: makeEvent('tabGroups.onUpdated'),
      onRemoved: makeEvent('tabGroups.onRemoved'),
      onMoved: makeEvent('tabGroups.onMoved')
    },
    {
      get(...args) { return callLocal(() => null, args); },
      query(...args) { return callLocal(() => [], args); },
      update(...args) { return callLocal(() => ({}), args); },
      move(...args) { return callLocal(() => ({}), args); }
    }
  );

  // --- userScripts ---
  const userScriptsList = new Map();
  installNamespace(
    'userScripts',
    {},
    {},
    {
      register(...args) {
        return callLocal((scripts) => {
          if (Array.isArray(scripts)) {
            for (const s of scripts) {
              if (s && s.id) userScriptsList.set(s.id, s);
            }
          }
          return undefined;
        }, args);
      },
      unregister(...args) {
        return callLocal((filter) => {
          if (filter && Array.isArray(filter.ids)) {
            for (const id of filter.ids) userScriptsList.delete(id);
          } else {
            userScriptsList.clear();
          }
          return undefined;
        }, args);
      },
      update(...args) {
        return callLocal((scripts) => {
          if (Array.isArray(scripts)) {
            for (const s of scripts) {
              if (s && s.id) userScriptsList.set(s.id, { ...(userScriptsList.get(s.id) || {}), ...s });
            }
          }
          return undefined;
        }, args);
      },
      getScripts(...args) {
        return callLocal((filter) => {
          const all = Array.from(userScriptsList.values());
          if (filter && Array.isArray(filter.ids)) {
            const idSet = new Set(filter.ids);
            return all.filter((s) => idSet.has(s.id));
          }
          return all;
        }, args);
      },
      configureWorld(...args) { return callLocal(() => undefined, args); }
    }
  );

  // --- declarativeContent ---
  function PageStateMatcher(opts) { Object.assign(this, opts || {}); }
  function ShowAction(opts) { Object.assign(this, opts || {}); }
  function ShowPageAction(opts) { Object.assign(this, opts || {}); }
  installNamespace(
    'declarativeContent',
    {},
    {
      onPageChanged: makeEvent('declarativeContent.onPageChanged', true),
      PageStateMatcher,
      ShowAction,
      ShowPageAction
    }
  );

  // --- identity ---
  installNamespace(
    'identity',
    {},
    { onSignInChanged: makeEvent('identity.onSignInChanged') },
    {
      getRedirectURL(path = '') {
        const id = (chromeObj.runtime && chromeObj.runtime.id) || 'extension';
        const clean = String(path || '').replace(/^\/+/, '');
        return `https://${id}.chromiumapp.org/${clean}`;
      },
      launchWebAuthFlow(...args) { return callLocal(() => undefined, args); },
      getProfileUserInfo(...args) { return callLocal(() => ({ email: '', id: '' }), args); },
      getAuthToken(...args) { return callLocal(() => undefined, args); },
      removeCachedAuthToken(...args) { return callLocal(() => undefined, args); }
    }
  );

  // --- management ---
  installNamespace(
    'management',
    {},
    {
      onInstalled: makeEvent('management.onInstalled'),
      onUninstalled: makeEvent('management.onUninstalled'),
      onEnabled: makeEvent('management.onEnabled'),
      onDisabled: makeEvent('management.onDisabled')
    },
    {
      getSelf(...args) {
        return callLocal(() => ({
          id: (chromeObj.runtime && chromeObj.runtime.id) || '',
          name: '',
          version: '1.0.0',
          enabled: true,
          type: 'extension',
          installType: 'normal'
        }), args);
      },
      getAll(...args) { return callLocal(() => [], args); },
      get(...args) { return callLocal(() => null, args); }
    }
  );

  // --- sessions ---
  installNamespace(
    'sessions',
    {},
    { onChanged: makeEvent('sessions.onChanged') },
    {
      getRecentlyClosed(...args) { return callLocal(() => [], args); },
      getDevices(...args) { return callLocal(() => [], args); },
      restore(...args) { return callLocal(() => ({}), args); }
    }
  );

  // --- browsingData ---
  installNamespace(
    'browsingData',
    {},
    {},
    {
      remove(...args) { return callLocal(() => undefined, args); },
      settings(...args) { return callLocal(() => ({ options: {}, dataToRemove: {}, dataRemovalPermitted: {} }), args); }
    }
  );

  // --- history ---
  installNamespace(
    'history',
    {},
    {
      onVisited: makeEvent('history.onVisited'),
      onVisitRemoved: makeEvent('history.onVisitRemoved')
    },
    {
      search(...args) { return callLocal(() => [], args); },
      getVisits(...args) { return callLocal(() => [], args); },
      addUrl(...args) { return callLocal(() => undefined, args); },
      deleteUrl(...args) { return callLocal(() => undefined, args); },
      deleteRange(...args) { return callLocal(() => undefined, args); },
      deleteAll(...args) { return callLocal(() => undefined, args); }
    }
  );

  // --- bookmarks ---
  installNamespace(
    'bookmarks',
    {},
    {
      onCreated: makeEvent('bookmarks.onCreated'),
      onRemoved: makeEvent('bookmarks.onRemoved'),
      onChanged: makeEvent('bookmarks.onChanged'),
      onMoved: makeEvent('bookmarks.onMoved')
    },
    {
      get(...args) { return callLocal(() => [], args); },
      getTree(...args) { return callLocal(() => [{ id: '0', title: '', children: [] }], args); },
      getChildren(...args) { return callLocal(() => [], args); },
      search(...args) { return callLocal(() => [], args); },
      create(...args) { return callLocal((bm) => ({ id: String(Date.now()), title: (bm && bm.title) || '' }), args); },
      update(...args) { return callLocal((id, changes) => ({ id, ...(changes || {}) }), args); },
      move(...args) { return callLocal((id) => ({ id }), args); },
      remove(...args) { return callLocal(() => undefined, args); }
    }
  );

  // --- downloads ---
  installNamespace(
    'downloads',
    {},
    {
      onCreated: makeEvent('downloads.onCreated'),
      onChanged: makeEvent('downloads.onChanged'),
      onErased: makeEvent('downloads.onErased')
    },
    {
      download(...args) { return callLocal(() => 1, args); },
      search(...args) { return callLocal(() => [], args); },
      pause(...args) { return callLocal(() => undefined, args); },
      resume(...args) { return callLocal(() => undefined, args); },
      cancel(...args) { return callLocal(() => undefined, args); },
      erase(...args) { return callLocal(() => [], args); },
      open(...args) { return callLocal(() => undefined, args); },
      show(...args) { return callLocal(() => undefined, args); }
    }
  );

  // --- omnibox ---
  installNamespace(
    'omnibox',
    {},
    {
      onInputStarted: makeEvent('omnibox.onInputStarted'),
      onInputChanged: makeEvent('omnibox.onInputChanged'),
      onInputEntered: makeEvent('omnibox.onInputEntered'),
      onInputCancelled: makeEvent('omnibox.onInputCancelled')
    },
    {
      setDefaultSuggestion() {}
    }
  );

  // --- webRequest ---
  installNamespace(
    'webRequest',
    {},
    {
      onBeforeRequest: makeEvent('webRequest.onBeforeRequest'),
      onBeforeSendHeaders: makeEvent('webRequest.onBeforeSendHeaders'),
      onSendHeaders: makeEvent('webRequest.onSendHeaders'),
      onHeadersReceived: makeEvent('webRequest.onHeadersReceived'),
      onAuthRequired: makeEvent('webRequest.onAuthRequired'),
      onResponseStarted: makeEvent('webRequest.onResponseStarted'),
      onBeforeRedirect: makeEvent('webRequest.onBeforeRedirect'),
      onCompleted: makeEvent('webRequest.onCompleted'),
      onErrorOccurred: makeEvent('webRequest.onErrorOccurred')
    },
    {
      handlerBehaviorChanged(...args) { return callLocal(() => undefined, args); }
    }
  );
})();
