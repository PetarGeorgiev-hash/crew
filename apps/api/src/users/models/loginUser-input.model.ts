import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class LoginUserModel {
  @Field()
  email: string;

  @Field()
  password: string;
}
