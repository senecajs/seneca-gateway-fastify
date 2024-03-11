"use strict";
/* Copyright © 2021-2022 Richard Rodger, MIT License. */
Object.defineProperty(exports, "__esModule", { value: true });
const gubu_1 = require("gubu");
function gateway_express(options) {
    const seneca = this;
    const tag = seneca.plugin.tag;
    const gtag = (null == tag || '-' === tag) ? '' : '$' + tag;
    const gateway = seneca.export('gateway' + gtag + '/handler');
    const parseJSON = seneca.export('gateway' + gtag + '/parseJSON');
    seneca.act('sys:gateway,add:hook,hook:delegate', {
        gateway: 'express',
        tag: seneca.plugin.tag,
        action: (_json, ctx) => {
            ctx.req.seneca$ = this;
        }
    });
    async function handler(req, res, next) {
        var _a, _b, _c;
        const body = req.body;
        const json = 'string' === typeof body ? parseJSON(body) : body;
        // TODO: doc as a standard feature
        // TODO: implement in other gateways
        // TODO: headers & body as per gateway-lambda
        json.gateway = {
            params: req.params,
            query: req.query,
        };
        if (json.error$) {
            return res.status(400).send(json);
        }
        const result = await gateway(json, { req, res });
        let gateway$ = result.gateway$;
        if (gateway$) {
            if (gateway$.auth && options.auth) {
                if (gateway$.auth.token) {
                    res.cookie(options.auth.token.name, gateway$.auth.token, {
                        ...options.auth.cookie,
                        ...(gateway$.auth.cookie || {})
                    });
                }
                else if (gateway$.auth.remove) {
                    res.clearCookie(options.auth.token.name);
                }
            }
            // TODO: should also match `headers`
            if (gateway$.header) {
                res.set(gateway$.header);
            }
            if (gateway$.next) {
                // Uses the default express error handler
                return next(result.error ? result.out : undefined);
            }
            // Should be last as final action
            else if ((_a = gateway$.redirect) === null || _a === void 0 ? void 0 : _a.location) {
                return res.redirect((_b = gateway$.redirect) === null || _b === void 0 ? void 0 : _b.location);
            }
            if (result.error) {
                if ((_c = options.error) === null || _c === void 0 ? void 0 : _c.next) {
                    return next(result.error ? result.out : undefined);
                }
                else {
                    res.status(gateway$.status || 500);
                    return res.send(result.out);
                }
            }
            else {
                if (gateway$.status) {
                    res.status(gateway$.status);
                }
                return res.send(result.out);
            }
        }
        else {
            return res.send(result.out);
        }
    }
    // Named webhook handler
    async function hook(req, res, next) {
        const body = req.body || {};
        const name = req.params.name;
        const code = req.params.code;
        // Standard message for hooks based on URL path format:
        // /prefix/:name/:code
        const hookmsg = {
            handle: 'hook',
            name,
            code,
            body: 'string' === typeof body ? parseJSON(body) : body
        };
        req.body = hookmsg;
        return handler(req, res, next);
    }
    return {
        name: 'gateway-express',
        exports: {
            handler,
            hook,
        }
    };
}
// Default options.
gateway_express.defaults = {
    auth: {
        token: {
            name: 'seneca-auth'
        },
        cookie: (0, gubu_1.Open)({
            maxAge: 365 * 24 * 60 * 60 * 1000,
            httpOnly: true,
            sameSite: true,
        })
    },
    error: {
        next: false
    }
};
exports.default = gateway_express;
if ('undefined' !== typeof (module)) {
    module.exports = gateway_express;
}
//# sourceMappingURL=gateway-express.js.map