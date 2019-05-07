import IframeHandler from '../helper/iframe-handler';
import objectHelper from '../helper/object';

function runWebMessageFlow(authorizeUrl, options, callback) {
  var handler = new IframeHandler({
    url: authorizeUrl,
    eventListenerType: 'message',
    callback: function(eventData) {
      callback(null, eventData);
    },
    timeout: options.timeout,
    eventValidator: {
      isValid: function(eventData) {
        return (
          eventData.event.data.type === 'authorization_response' &&
          options.state === eventData.event.data.response.state
        );
      }
    },
    timeoutCallback: function() {
      callback({
        error: 'timeout',
        error_description: 'Timeout during executing web_message communication',
        state: options.state
      });
    }
  });
  handler.init();
}

function WebMessageHandler(webAuth) {
  this.webAuth = webAuth;
}

WebMessageHandler.prototype.run = function(options, cb) {
  var _this = this;
  options.responseMode = 'web_message';
  options.prompt = 'none';

  var currentOrigin = (window.location && window.location.origin) || null;
  var redirectUriOrigin = objectHelper.getOriginFromUrl(options.redirectUri);
  if (redirectUriOrigin && currentOrigin !== redirectUriOrigin) {
    return cb({
      error: 'origin_mismatch',
      error_description:
        "The redirectUri's origin (" +
        redirectUriOrigin +
        ") should match the window's origin (" +
        currentOrigin +
        ').'
    });
  }

  runWebMessageFlow(this.webAuth.client.buildAuthorizeUrl(options), options, function(
    err,
    eventData
  ) {
    var error = err;
    if (!err && eventData.event.data.response.error) {
      error = eventData.event.data.response;
    }
    if (!error) {
      var parsedHash = eventData.event.data.response;
      return _this.webAuth.validateAuthenticationResponse(options, parsedHash, cb);
    }
    if (
      error.error === 'consent_required' &&
      window.location.hostname === 'localhost'
    ) {
      console.warn(
        "Consent Required. Consent can't be skipped on localhost. Read more here: https://auth0.com/docs/api-auth/user-consent#skipping-consent-for-first-party-clients"
      );
    }
    _this.webAuth.transactionManager.clearTransaction(error.state);
    return cb(objectHelper.pick(error, ['error', 'error_description']));
  });
};

export default WebMessageHandler;
