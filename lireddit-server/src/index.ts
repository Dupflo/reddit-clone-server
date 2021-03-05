import 'reflect-metadata'
import { MikroORM } from '@mikro-orm/core'
import microConfig from './mikro-orm.config'
import express from 'express'
import { ApolloServer } from 'apollo-server-express'
import { buildSchema } from 'type-graphql'
import { HelloResolver } from './resolvers/hello'
import { PostResolver } from './resolvers/posts'
import { UserResolver } from './resolvers/user'
import redis from 'redis'
import { __prod__ } from './constants'
import { MyContext } from './types'
import session from 'express-session'
import connectRedis from 'connect-redis'

console.log('dirname: ', __dirname)

const main = async () => {
  const orm = await MikroORM.init(microConfig) // connexion à la base
  await orm.getMigrator().up() // run migration

  const app = express()

  const RedisStore = connectRedis(session)
  const redisClient = redis.createClient()

  app.use(
    session({
      name: 'qid',
      store: new RedisStore({
        client: redisClient,
        disableTouch: true, //désactive le TTL
      }),
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 365 * 10, // 10 years
        httpOnly: true, //pour la sécurité
        sameSite: 'lax', // csrf
        secure: __prod__, // cookie fonctionne seulement avec HTTPS
      },
      saveUninitialized: false,
      secret: 'qkdndhkcdksfkpeslsoszc',
      resave: false,
    })
  )

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [HelloResolver, PostResolver, UserResolver],
      validate: false,
    }),

    context: ({ req, res }): MyContext => ({ em: orm.em, req, res }),
  })

  apolloServer.applyMiddleware({ app }) //create graphql endpoint on express

  app.listen(4000, () => {
    console.log('server started on localhost:4000')
  })
}

main()
