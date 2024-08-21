package io.tolgee.dtos.request.task

class CreateMultipleTasksRequest(
  var tasks: MutableSet<CreateTaskRequest> = mutableSetOf(),
)
