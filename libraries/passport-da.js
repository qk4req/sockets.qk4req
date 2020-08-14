var OAuth2Strategy = require("passport-oauth2")
var InternalOAuthError = OAuth2Strategy.InternalOAuthError
/**
 * `Strategy` constructor.
 *
 * The Twitch authentication strategy authenticates requests by delegating to
 * Twitch using the OAuth 2.0 protocol.
 *
 * Applications must supply a `verify` callback which accepts an `accessToken`,
 * `refreshToken` and service-specific `profile`, and then calls the `done`
 * callback supplying a `user`, which should be set to `false` if the
 * credentials are not valid.  If an exception occured, `err` should be set.
 *
 * Options:
 *   - `clientID`      your Twitch application"s client id
 *   - `clientSecret`  your Twitch application"s client secret
 *   - `callbackURL`   URL to which Twitch will redirect the user after granting authorization
 *   - `pem`           Signing certificate used for decoding a user's OIDC token
 *
 * Examples:
 *
 *     passport.use(new TwitchStrategy({
 *         clientID: "123-456-789",
 *         clientSecret: "shhh-its-a-secret"
 *         callbackURL: "https://www.example.net/auth/twitch/callback"
 *       },
 *       function(accessToken, refreshToken, profile, done) {
 *         User.findOrCreate(..., function (err, user) {
 *           done(err, user)
 *         })
 *       }
 *     ))
 *
 * @param {Object} options
 * @param {Function} verify
 * @api public
 */
class DAStrategy extends OAuth2Strategy {
    constructor(options, verify) {
        options = options || {}
        options.authorizationURL = options.authorizationURL || "https://www.donationalerts.com/oauth/authorize"
        options.tokenURL = options.tokenURL || "https://www.donationalerts.com/oauth/token"
        options.customHeaders = options.customHeaders || {}
        options.customHeaders['Client-ID'] = options.clientID

        super(options, verify)

        this.name = "da"
        this.pem = options.pem

        this._oauth2.setAuthMethod("Bearer")
        this._oauth2.useAuthorizationHeaderforGET(true)
    }

    userProfile(accessToken, done) {
        this._oauth2.get("https://www.donationalerts.com/api/v1/user/oauth", accessToken, function (err, body, res) {
            if (err) { return done(new InternalOAuthError("failed to fetch user profile", err)); }

            try {
                done(null, {
                    ...JSON.parse(body).data,
                    provider: 'da'
                });
            } catch(e) {
                done(e);
            }
        });
    }

    authorizationParams(options) {
        var params = {}
        if (typeof options.forceVerify !== "undefined") {
            params.force_verify = !!options.forceVerify
        }
        return params
    }
}

module.exports = DAStrategy
