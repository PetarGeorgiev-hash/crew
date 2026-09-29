import { Field, ObjectType } from '@nestjs/graphql';
import { SafeUser } from './user.schema';

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

  @Field(() => String, { nullable: true })
  provider: string | null;

  @Field(() => String, { nullable: true })
  providerId: string | null;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
