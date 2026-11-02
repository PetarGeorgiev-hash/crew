import { Field, ObjectType } from '@nestjs/graphql';
import { UserModel } from '../../users/models/user.model';

@ObjectType()
export class AuthResult {
  @Field(() => UserModel)
  user: {
    id: string;
    email: string;
    userName: string;
    avatarUrl?: string;
    emailVerified: boolean;
  };
  @Field()
  accessToken: string;
  @Field()
  refreshToken: string;
}
