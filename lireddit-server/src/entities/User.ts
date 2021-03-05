import "reflect-metadata"
import { Entity, PrimaryKey, Property } from '@mikro-orm/core'
import { ObjectType, Field, Int} from "type-graphql"

@ObjectType()
@Entity() // database table
export class User {
  @Field(() => Int)
  @PrimaryKey() // ID
  id!: number // string is also supported

  @Field(() => String)
  @Property({ type: 'date' })
  createdAt = new Date()

  @Field(() => String)
  @Property({ type: 'date', onUpdate: () => new Date() })
  updatedAt = new Date()

  @Field(() => String)
  @Property({ type: 'text', unique: true })
  username!: string

  @Property({ type: 'text'})
  password!: string
}
