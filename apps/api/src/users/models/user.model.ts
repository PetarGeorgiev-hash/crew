import { Field, ObjectType } from '@nestjs/graphql';
import { SafeUser } from '../schema/user.schema';

@ObjectType()
export class UserModel implements SafeUser {
  @Field()
  id: string;

  @Field()
  email: string;

  @Field()
  userName: string;

  @Field(() => String, { nullable: true })
  avatarUrl: string | null;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  @Field()
  emailVerifeid: boolean;
}
