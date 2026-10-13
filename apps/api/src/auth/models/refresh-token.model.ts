import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class RefreshTokenModel {
  @Field()
  refreshToken: string;
}
