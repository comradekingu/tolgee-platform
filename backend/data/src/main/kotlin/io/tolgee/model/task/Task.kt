package io.tolgee.model.task

import io.tolgee.model.*
import io.tolgee.model.enums.TaskState
import io.tolgee.model.enums.TaskType
import jakarta.persistence.*
import jakarta.validation.constraints.Size
import java.util.*

@Entity
@Table(uniqueConstraints = [
  UniqueConstraint(
    columnNames = ["project_id", "number"],
    name = "project_number_unique"
  )
])
class Task : StandardAuditModel() {
  @ManyToOne(fetch = FetchType.LAZY)
  var project: Project = Project() // Initialize to avoid null issues

  var number: Long = 1L

  @field:Size(max = 255)
  @Column(length = 255)
  var name: String = ""

  @field:Size(max = 2000)
  @Column(length = 2000)
  var description: String = ""

  @Enumerated(EnumType.STRING)
  var type: TaskType = TaskType.TRANSLATE

  @ManyToOne(fetch = FetchType.LAZY)
  lateinit var language: Language

  var dueDate: Date? = null

  @ManyToMany(fetch = FetchType.LAZY)
  var assignees: MutableSet<UserAccount> = mutableSetOf()

  @OneToMany(mappedBy = "task", fetch = FetchType.LAZY)
  var keys: MutableSet<TaskKey> = mutableSetOf()

  @ManyToOne(fetch = FetchType.LAZY, optional = true)
  var author: UserAccount? = null

  @Enumerated(EnumType.STRING)
  var state: TaskState = TaskState.IN_PROGRESS

  var closedAt: Date? = null
}
