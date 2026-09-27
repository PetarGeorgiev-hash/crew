import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class CreateUserModel {
  @Field()
  email: string;

  @Field()
  userName: string;

  @Field()
  passwordHash: string;
}
