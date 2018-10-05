'use strict';
const Hapi = require('hapi');
const Joi = require('joi');


const CatboxMongoDB = require('catbox-mongodb')
const CatboxRedisDB = require('catbox-redis')
const MongoDBUrl = 'mongodb://localhost:27017/cache';
const server = new Hapi.Server({
    cache : [{
        name      : 'mongoDbCache',
        engine    : CatboxMongoDB,
        uri       : MongoDBUrl, // Defaults to 'mongodb://127.0.0.1:27017/?maxPoolSize=5' if not provided
        partition : 'cache'
    },
        {
            name      : 'redisDbCache',
            engine    : CatboxRedisDB,
            uri       : '', // Defaults to 'mongodb://127.0.0.1:27017/?maxPoolSize=5' if not provided
            partition : 'cache'
        }

    ]
});


server.connection({  host : 'localhost',
    port: 5000

});

server.route({
    method: 'GET',
    path: '/',
    handler: function (request, reply) {
        reply('Hello Future Studio!')
    }
})

const CacheRecommend = server.cache({ cache: 'redisDbCache',segment: 'examples17', expiresIn: 5 * 60 * 1000 }); // cached for 5 mins
//const CacheRecommend = server.cache({ cache: 'mongoDbCache',segment: 'examples17', expiresIn: 5 * 60 * 1000 }); // cached for 5 mins

server.route({
    method: 'POST',
    path: '/recommend/{name}/',
    handler: async (request, h) => {

        const key = {
            segment: 'examples17',
            id: request.params.name
        };

        // get item from cache segment
        console.log("key is "+request.params.name)

        //const cache = server.cache({cache: 'redisCache',segment: 'countries', expiresIn: 5 * 60 * 1000 });
        CacheRecommend.set(request.params.name, { item: request.payload.recommenedArray } ,null, (err) => {

            if(err)
            {
                h("Some error occured while caching/setting the value")
            }
            else {
                h('Recommendation has been cached successfully for 90 second only')
            }
        });
        
    }
});



server.route({
    method: 'GET',
    path: '/recommend/{name}/',
    handler: async (request, h) => {

        const key = {
            segment: 'examples17',
            id: request.params.name
        };

        // get item from cache segment
        console.log("key is "+request.params.name)

        //const cache = server.cache({cache: 'redisCache',segment: 'countries', expiresIn: 5 * 60 * 1000 });
        //CacheRecommend.set(request.params.name, { item: request.payload.recommenedArray } ,null, (err) => {

            CacheRecommend.get(request.params.name, (err, value, cached, log) => {

                console.log("getting value is "+JSON.stringify(value))
                //return JSON.stringify(value)
                h(JSON.stringify(value))

                // value === { capital: 'oslo' };
            });
        
    }
});






// start your server
server.start(function (err) {
    if (err) {
        throw err
    }

    console.log('Server running at: ' + server.info.uri)
})





