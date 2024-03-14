

const Express = require('express')
const fastify = require('fastify')()
const Seneca = require('seneca')


run()

async function run() {
  let seneca = await runSeneca()
  let app = await runFastify(seneca)
}


async function runSeneca() {
  const seneca = Seneca({legacy:false})

  return seneca
    .test('print')    // Test mode, full debug logs
    .use('promisify')
    .use('entity')
    .use('repl')  // see https://github.com/senecajs/seneca-repl
    .use('gateway')
    .use('../..')  // 'gateway-express'
    .use('./bizlogic')
    .ready()
}


async function runFastify(seneca) {
  // Parse all incoming requests as JSON, regardless of Content-Type
  fastify.addContentTypeParser('*', (request, payload, done) => {
    let data = '';
    payload.on('data', chunk => { data += chunk; });
    payload.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        done(null, parsed);
      } catch (err) {
        done(err, undefined);
      }
    });
  });

  // Define the POST /api route
  fastify.post('/api', async (request, reply) => {
    // Here you would adapt your seneca handler for Fastify's request and reply objects
    // Assuming seneca.export('gateway-fastify/handler') returns a function compatible with Fastify
    let next = true
    return seneca.export('gateway-fastify/handler')(request, reply,next);
  });

  // Listen on port 8080
  try {
    await fastify.listen(8080);
    console.log(`Server listening on ${fastify.server.address().port}`);
    return fastify;
  } catch (err) {
    fastify.log.error(err);

  }
}





