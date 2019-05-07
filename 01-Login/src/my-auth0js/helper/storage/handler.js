import DummyStorage from './dummy';
import CookieStorage from './cookie';

function StorageHandler(options) {
  this.storage = new CookieStorage();
  if (options.__tryLocalStorageFirst !== true) {
    return;
  }
  try {
    this.storage = localStorage;
  } catch (e) {
    console.warn(e);
    console.warn("Can't use localStorage. Using CookieStorage instead.");
  }
}

StorageHandler.prototype.failover = function() {
  if (this.storage instanceof DummyStorage) {
    this.warn.warning('DummyStorage: ignore failover');
    return;
  } else if (this.storage instanceof CookieStorage) {
    this.warn.warning('CookieStorage: failing over DummyStorage');
    this.storage = new DummyStorage();
  } else {
    this.warn.warning('LocalStorage: failing over CookieStorage');
    this.storage = new CookieStorage();
  }
};

StorageHandler.prototype.getItem = function(key) {
  try {
    return this.storage.getItem(key);
  } catch (e) {
    this.warn.warning(e);
    this.failover();
    return this.getItem(key);
  }
};

StorageHandler.prototype.removeItem = function(key) {
  try {
    return this.storage.removeItem(key);
  } catch (e) {
    this.warn.warning(e);
    this.failover();
    return this.removeItem(key);
  }
};

StorageHandler.prototype.setItem = function(key, value, options) {
  try {
    return this.storage.setItem(key, value, options);
  } catch (e) {
    this.warn.warning(e);
    this.failover();
    return this.setItem(key, value, options);
  }
};

export default StorageHandler;
