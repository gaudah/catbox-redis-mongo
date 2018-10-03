'use strict';

const Hapi = require('hapi');
const mongoose = require('mongoose');

const MongoDBUrl = 'mongodb://localhost:27017/aishu';

const server = Hapi.server({
    port: 5000,
    host: 'localhost',
    cache: [
        {
            name: 'mongoCache',
            engine: require('catbox-mongodb'),
            host: '127.0.0.1',
            partition: 'cache'   //cache name we want to specify. By default 'hapi-cache' is used
        },
        {
            name: 'redisCache',
            engine: require('catbox-redis'),
            host: '127.0.0.1',
            partition: 'cache' //cache name we want to specify. By default 'hapi-cache' is used
        }
    ]
});

server.route({
        method: 'GET',
        path: '/hello',
        handler: (request, h) => {
	      return 'hello all'
        }
    });


//Server side caching
//Following example store the result i.e addition in mongo cache and redis cache

const sayHi = () => {console.log("Hi....")}

const add = async (a, b) => {
	await sayHi(); 
        return Number(a) + Number(b);
    };

    const sumCache = server.cache({
        cache: 'mongoCache',
        expiresIn: 10 * 9000,  //Expires after 90 sec
        segment: 'customSegment', //Name of the collection
        generateFunc: async (id) => {

            return await add(id.a, id.b);
        },
        generateTimeout: 2000
    });

const sumCacheRedis = server.cache({
        cache: 'redisCache',
        expiresIn: 10 * 9000, //Expires after 90 sec
        segment: 'customSegment', //Name of the key we want to store in redis
        generateFunc: async (id) => {

            return await add(id.a, id.b);
        },
        generateTimeout: 2000
    });

    server.route({
        path: '/addMongo/{a}/{b}',
        method: 'GET',
        handler: async function (request, h) {

            const { a, b } = request.params;
            const id = `${a}:${b}`;

            return await sumCache.get({ id, a, b });
        }
    });

server.route({
        path: '/addRedis/{a}/{b}',
        method: 'GET',
        handler: async function (request, h) {

            const { a, b } = request.params;
            const id = `${a}:${b}`;

            return await sumCacheRedis.get({ id, a, b });
        }
    });


//mongoCache and redisCache to define userdefined key and value
// define a cache segment to store cache items

//Following example stores the result in cache by specifying userdefined key ,value and id
const Cache = server.cache({ cache: 'mongoCache',segment: 'examples', expiresIn: 10 * 9000 });


const CacheRedis = server.cache({cache: 'redisCache',segment: 'examples1', expiresIn: 10 * 9000 });


const CacheMemory = server.cache({segment: 'examples', expiresIn: 10 * 9000 }); //If we don't specify cache then by default catbox-memory adapter is used and uses browser cache to store

// wildcard route that responds all requests
// either with data from cache or default string
server.route({
    method: 'GET',
    path: '/{path*}',
    handler: async (request, h) => {

        const key = {
            segment: 'examples1',
            id: 'myExample1'
        };

        // get item from cache segment
        const cached = await Cache.get(key);

        if (cached) {
            return `From cache: ${cached.item}`;
        }

        // fill cache with item
        await Cache.set(key, { item: 'my example1' }, 5000);

        return 'my example1';
    }
});



server.route({
    method: 'GET',
    path: '/redisKey',
    handler: async (request, h) => {

        const key = {
            segment: 'examples',
            id: 'myExample'
        };

        // get item from cache segment
        const cached = await CacheRedis.get(key);

        if (cached) {
            return `From cache: ${cached.item}`;
        }

        // fill cache with item
        await CacheRedis.set(key, { item: 'my example' }, 5000);

        return 'my example';
    }
});



server.route({
    method: 'GET',
    path: '/memoryCache',
    handler: async (request, h) => {

        const key = {
            segment: 'examples',
            id: 'myExample'
        };

        // get item from cache segment
        const cached = await CacheMemory.get(key);

        if (cached) {
            return `From cache: ${cached.item}`;
        }

        // fill cache with item
        await CacheMemory.set(key, { item: 'my example' }, 5000);

        return 'my example';
    }
});



//Example of server method for caching purpose

server.method('sum', add, {
        cache: {
            cache: 'redisCache',
            expiresIn: 10 * 9000,
            generateTimeout: 2000,
	    getDecoratedValue: true // provide more information about the value retrieved from the cache.
        }
    });

    server.route({
        path: '/addUsingServerMethod/{a}/{b}',
        method: 'GET',
        handler: async function (request, h) {

            const { a, b } = request.params;
            //return await server.methods.sum(a, b); OR
	    const { value, cached } = await server.methods.sum(a, b);
            const lastModified = cached ? new Date(cached.stored) : new Date();

            return h.response(value)
                .header('Last-modified', lastModified.toUTCString());
        }
    });


(async () => {
  try {  
    await server.start(); 
    mongoose.connect(MongoDBUrl,{ useNewUrlParser: true }).then(() => { console.log(`Connected to Mongo server`) }, err => { console.log(err) });
    console.log(`Server running at: ${server.info.uri}`);
  }
  catch (err) {  
    console.log(err)
  }
})();





