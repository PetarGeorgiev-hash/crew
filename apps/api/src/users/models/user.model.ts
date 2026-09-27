import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class UserModel {
  @Field()
  id: string;

  @Field()
  email: string;

  @Field()
  userName: string;

  @Field(() => String, { nullable: true })
  avatarUrl: string | null;
}
