import { Args, Query, Resolver } from '@nestjs/graphql';
import { UserModel } from './models/user.model';
import { UsersService } from './users.service';

@Resolver(() => UserModel)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @Query(() => UserModel)
  findOne(@Args('id') id: string) {
    return this.usersService.findById(id);
  }

  //todo: create mutations
}
