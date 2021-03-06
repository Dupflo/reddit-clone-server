import { User } from '../entities/User'
import { MyContext } from 'src/types'
import {
  Resolver,
  Arg,
  InputType,
  Field,
  Ctx,
  Mutation,
  ObjectType,
  Query,
} from 'type-graphql'
import argon2 from 'argon2'

@InputType()
class UsernamePasswordInput {
  @Field()
  username: string
  @Field()
  password: string
}

@ObjectType()
class FieldError {
  @Field()
  field: string
  @Field()
  message: string
}

@ObjectType()
class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[]

  @Field(() => User, { nullable: true })
  user?: User
}

@Resolver()
export class UserResolver {
  @Query(() => User, { nullable: true })
  me(@Ctx() { req, em }: MyContext) {
    // tu n'est pas connecté
    if (!req.session.userId) {
      return null
    }

    const user = em.findOne(User, { id: req.session.userId })
    return user
  }

  @Mutation(() => UserResponse)
  async register(
    @Arg('options') options: UsernamePasswordInput,
    @Ctx() { em, req }: MyContext
  ): Promise<UserResponse> {
    if (options.username.length <= 2) {
      return {
        errors: [
          {
            field: 'username',
            message: 'Length must be greater than 2',
          },
        ],
      }
    }

    if (options.password.length <= 2) {
      return {
        errors: [
          {
            field: 'password',
            message: 'Length must be greater than 2',
          },
        ],
      }
    }

    const hashedPassword = await argon2.hash(options.password)
    const user = em.create(User, {
      username: options.username,
      password: hashedPassword,
    })
    try {
      await em.persistAndFlush(user)
    } catch (err) {
      if (err.code === '23505')
        //|| err.detail.includes('already exists')) {
        return {
          errors: [
            {
              field: 'username',
              message: 'Username already exist',
            },
          ],
        }
    }

    //store user id session
    // ajoute un cookie
    // garde l'utilisateur connecté
    req.session.userId = user.id

    return { user }
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg('options') options: UsernamePasswordInput,
    @Ctx() { em, req }: MyContext
  ): Promise<UserResponse> {
    const user = await em.findOne(User, { username: options.username })
    if (!user) {
      return {
        errors: [
          {
            field: 'username',
            message: 'That username does not exist',
          },
        ],
      }
    }
    const valid = await argon2.verify(user.password, options.password)

    if (!valid) {
      return {
        errors: [
          {
            field: 'password',
            message: 'Incorrect password',
          },
        ],
      }
    }

    req.session.userId = user.id

    return {
      user,
    }
  }
}
