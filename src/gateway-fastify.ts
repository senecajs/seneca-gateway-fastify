/* Copyright © 2021-2022 Richard Rodger, MIT License. */


import { Open } from 'gubu'
import fastify from 'fastify';
import type {
  GatewayResult
} from '@seneca/gateway'
const createError = require('@fastify/error')



const app = fastify();


interface SenecaActionErrorOptions {
  code?: string; // optional
  // We can include other properties as needed
}

class SenecaActionError extends Error {
  code: any;
  constructor(message :any , options: SenecaActionErrorOptions = {}) {
    super(message);
    this.name = 'SenecaActionError';
    if(options.code){ this.code = options.code;}
    this.code = options?.code || 'ACT_ERROR';
  }
}


type GatewayFastifyOptions = {
  auth?: {
    token: {
      // Cookie name
      name: string
    }
    // Default cookie fields
    cookie?: any
  },
  error?: {

    // Use the default express error handler for errors
    next: boolean
  },
}

//need to refactor directive to use fastify's error handling or custom error handling
type GatewayFastifyDirective = {
  // Call fastify response.next (passes error if defined)
  next?: boolean

  // Set/remove login cookie
  auth?: {

    // Cookie token value
    token: string

    // Override option cookie fields
    cookie?: any

    // Remove auth cookie
    remove?: boolean
  }

  // HTTP redirect
  redirect?: {
    location: string
  }

  // HTTP status code
  status?: number

  header?: Record<string, any>
}


function gateway_fastify(this: any, options: GatewayFastifyOptions) {
  const seneca: any = this

  const tag = seneca.plugin.tag
  const gtag = (null == tag || '-' === tag) ? '' : '$' + tag
  const gateway = seneca.export('gateway' + gtag + '/handler')
  const parseJSON = seneca.export('gateway' + gtag + '/parseJSON')


  seneca.act('sys:gateway,add:hook,hook:delegate', {
    gateway: 'fastify',
    tag: seneca.plugin.tag,
    action: (_json: any, ctx: any) => {
      ctx.req.seneca$ = this
    }
  })


  /* adding an error handler to help port from express to fastify */
  const errorHandler = (err: any, req: any, reply: any, next: any) => {
    try {
      app.setErrorHandler((error, request, reply) => {
        // Log the error
        this.log.error(err);
      
        // Check if it's a known error and respond accordingly
        if (err.statusCode) {
          console.log('statusCode: ', err.statusCode)
          //reply.status(err.statusCode).send({ error: err.message });
        } else {
          // Handle unknown errors
          console.log('statusCode: ', 500)
          //reply.status(500).send({ error: 'Internal Server Error' });
        }
      });
    }
    catch (err) {
      console.log('errorHandler Error', err)
      
    }
  } //end of errorHandler

  /* changed handler to handle fastify request and reply instead of req, res which is typical to express */

  async function handler(req: any, reply: any, next: any) {
    const body = req.body

    const json = 'string' === typeof body ? parseJSON(body) : body

    console.log('BODY', json)

    // TODO: doc as a standard feature
    // TODO: implement in other gateways
    // TODO: headers & body as per gateway-lambda
    json.gateway = {
      params: req.params,
      query: req.query,
    }

    if (json.error$) { //refactored to use fastify's reply instead of res
      return reply.code(400).send(json);
    }

    //Question: do I need to adapt the gateway function to use fastify's reply instead of res?
    const result: GatewayResult = await gateway(json, { req, reply })

    let gateway$: GatewayFastifyDirective | undefined = result.gateway$

    if (gateway$) {
      if (gateway$.auth && options.auth) {
        if (gateway$.auth.token) {

          //refactored to use fastify's reply instead of res
          reply.setCookie(
            options.auth.token.name,
            gateway$.auth.token,
            {
              ...options.auth.cookie,
              ...(gateway$.auth.cookie || {})
            }
          )
        }
        else if (gateway$.auth.remove) {
          //refactored to use fastify's reply instead of res
          reply.clearCookie(options.auth.token.name)
        }
      }

      // TODO: should also match `headers`
      if (gateway$.header) {
        reply.set(gateway$.header)
      }
      console.log(gateway$.next)
      if (gateway$.next) {
        // Uses the default express error handler
        //return next(result.error ? result.out : undefined)
        //refactored - leaving structure here for future reference, can add custom error handling here
        //assumption is that the existing system would initially continue to pass the next parameter.
          // to prevent breakage, the next parameter is left in place
          return reply.send(result.error ? result.out : undefined)
      }

      // Should be last as final action
      else if (gateway$.redirect?.location) {
        //refactored to use fastify's reply.redirect instead of res.redirect
        return reply.redirect(gateway$.redirect?.location)
      }

      if (result.error) {
        if (options.error?.next) {
          
          const error = new SenecaActionError('Error in Seneca action', { code: 'ACT_MISSING_ERROR' });
          throw error; // Let Fastify handle the error
          
        }
        else {
          // refactored to use fastify's reply.status instead of res.status
          if (gateway$.status) {
            reply.status(gateway$.status) //refactored to use fastify's reply.status instead of res.status
          }
          return reply.send(options.error) 
        }
      }
      else {
        if (gateway$.status) {
          reply.status(gateway$.status) //refactored to use fastify's reply.status instead of res.status
        }
        return reply.send(result.out) //refactored to use fastify's reply.send instead of res.send
      }
    }
    else {
      return reply.send(result.out) //refactored to use fastify's reply.send instead of res.send
    }
  }

  // Named webhook handler
  async function hook(req: any, res: any, next: any) {
    const body = req.body || {}

    const name = req.params.name
    const code = req.params.code

    // Standard message for hooks based on URL path format:
    // /prefix/:name/:code
    const hookmsg = {
      handle: 'hook',
      name,
      code,
      body: 'string' === typeof body ? parseJSON(body) : body
    }

    req.body = hookmsg

    return handler(req, res, next)
  }


  return {
    name: 'gateway-fastify',
    exports: {
      handler,
      hook,
    }
  }
}


// Default options.
gateway_fastify.defaults = {
  auth: {
    token: {
      name: 'seneca-auth'
    },
    cookie: Open({
      maxAge: 365 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: true,
    })
  },
  error: {
    next: false
  }
}


export default gateway_fastify

if ('undefined' !== typeof (module)) {
  module.exports = gateway_fastify
}
