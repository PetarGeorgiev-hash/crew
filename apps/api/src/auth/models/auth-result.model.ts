import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { IsNotEmpty, IsString } from 'class-validator';
import { UserModel } from '../../users/models/user.model';

@ObjectType()
export class AuthResult {
  @Field(() => UserModel)
  user: {
    id: string;
    email: string;
    userName: string;
    avatarUrl?: string;
  };
  @Field()
  accessToken: string;
  @Field()
  refreshToken: string;
}

@InputType()
export class RefreshTokenInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
