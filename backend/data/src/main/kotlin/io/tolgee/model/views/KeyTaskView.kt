package io.tolgee.model.views

import io.tolgee.model.enums.TaskType

class KeyTaskView(
  val id: Long,
  val languageId: Long,
  val languageTag: String,
  val done: Boolean,
  val userAssigned: Boolean,
  val type: TaskType,
)
