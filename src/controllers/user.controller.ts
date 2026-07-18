// =====================================================
// User Controller
// =====================================================

import { FastifyReply, FastifyRequest } from 'fastify'
import { Knex } from 'knex'
import { UserService } from '../services/user.service'
import { UserFilterInput, UpdateUserInput, CreateUserInput } from '../validators/user.validator'

export class UserController {
  private service: UserService

  constructor(private knex: Knex) {
    this.service = new UserService(knex)
  }

  list = async (req: FastifyRequest, reply: FastifyReply) => {
    const query = req.query as UserFilterInput
    // Phase 2: enforce school isolation via activeSchoolId
    const filter = { ...query, school_id: req.activeSchoolId } as UserFilterInput
    const result = await this.service.list(filter)
    return reply.send(result)
  }

  create = async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as CreateUserInput
    const user = await this.service.create(body as any)
    return reply.code(201).send(user)
  }

  getById = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: number }
    const user = await this.service.getById(id)
    return reply.send(user)
  }

  update = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: number }
    const body = req.body as UpdateUserInput

    if (req.activeSchoolId) {
      const existing = await this.service.getById(id)
      if (!existing) return reply.code(404).send({ message: 'User not found' })
      if ((existing as any).school_id !== req.activeSchoolId) {
        return reply.code(403).send({ message: 'You do not have permission to update this user' })
      }
    }

    const user = await this.service.update(id, body as any)
    return reply.send(user)
  }

  deactivate = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: number }

    if (req.activeSchoolId) {
      const existing = await this.service.getById(id)
      if (!existing) return reply.code(404).send({ message: 'User not found' })
      if ((existing as any).school_id !== req.activeSchoolId) {
        return reply.code(403).send({ message: 'You do not have permission to deactivate this user' })
      }
    }

    await this.service.deactivate(id)
    return reply.send({ message: 'User deactivated' })
  }
}