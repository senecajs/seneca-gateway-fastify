"use strict";
/* Copyright © 2021-2022 Richard Rodger, MIT License. */
Object.defineProperty(exports, "__esModule", { value: true });
const gubu_1 = require("gubu");
const createError = require('@fastify/error');
class SenecaActionError extends Error {
    constructor(options = {}) {
        super(options.code || 'ACT_ERROR');
        this.code = options.code || 'ACT_ERROR'; // Explicitly setting the error name
        // Ensure the stack trace is correctly captured in V8 environments (e.g., Chrome, Node.js)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, SenecaActionError);
        }
    }
}
function gateway_fastify(options) {
    const seneca = this;
    const tag = seneca.plugin.tag;
    const gtag = (null == tag || '-' === tag) ? '' : '$' + tag;
    const gateway = seneca.export('gateway' + gtag + '/handler');
    const parseJSON = seneca.export('gateway' + gtag + '/parseJSON');
    seneca.act('sys:gateway,add:hook,hook:delegate', {
        gateway: 'fastify',
        tag: seneca.plugin.tag,
        action: (_json, ctx) => {
            ctx.req.seneca$ = this;
        }
    });
    async function handler(req, reply, next) {
        const body = req.body;
        var _a, _b, _c;
        const json = 'string' === typeof body ? parseJSON(body) : body;
        console.log('BODY', json);
        // TODO: doc as a standard feature
        // TODO: implement in other gateways
        // TODO: headers & body as per gateway-lambda
        json.gateway = {
            params: req.params,
            query: req.query,
        };
        if (json.error$) { //refactored to use fastify's reply instead of res
            return reply.status(400).send(json);
        }
        //Question: do I need to adapt the gateway function to use fastify's reply instead of res?
        const result = await gateway(json, { req, reply });
        let gateway$ = result.gateway$;
        if (gateway$) {
            if (gateway$.auth && options.auth) {
                if (gateway$.auth.token) {
                    //refactored to use fastify's reply instead of res
                    reply.setCookie(options.auth.token.name, gateway$.auth.token, {
                        ...options.auth.cookie,
                        ...(gateway$.auth.cookie || {})
                    });
                }
                else if (gateway$.auth.remove) {
                    //refactored to use fastify's reply instead of res
                    reply.clearCookie(options.auth.token.name);
                }
            }
            // TODO: should also match `headers`
            if (gateway$.header) {
                reply.set(gateway$.header);
            }
            gateway$.next = false;
            if (gateway$.next) {
                // Uses the default express error handler
                return next(result.error ? result.out : undefined);
            }
            // Should be last as final action
            else if ((_a = gateway$.redirect) === null || _a === void 0 ? void 0 : _a.location) {
                return reply.redirect((_b = gateway$.redirect) === null || _b === void 0 ? void 0 : _b.location);
            }
            if (result.error) {
                if ((_c = options.error) === null || _c === void 0 ? void 0 : _c.next) {
                    return next(result.error ? result.out : undefined);
                }
                else {
                    reply.status(gateway$.status || 500);
                    return reply.send(result.out);
                }
            }
            else {
                if (gateway$.status) {
                    reply.status(gateway$.status); //refactored to use fastify's reply.status instead of res.status
                }
                return reply.send(result.out); //refactored to use fastify's reply.send instead of res.send
            }
        }
        else {
            return reply.send(result.out); //refactored to use fastify's reply.send instead of res.send
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
        name: 'gateway-fastify',
        exports: {
            handler,
            hook,
        }
    };
}
// Default options.
gateway_fastify.defaults = {
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
exports.default = gateway_fastify;
if ('undefined' !== typeof (module)) {
    module.exports = gateway_fastify;
}
//# sourceMappingURL=gateway-fastify.js.map