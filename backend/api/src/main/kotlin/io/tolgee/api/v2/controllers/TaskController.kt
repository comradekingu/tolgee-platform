package io.tolgee.api.v2.controllers

import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import io.tolgee.dtos.request.task.*
import io.tolgee.hateoas.task.TaskModel
import io.tolgee.hateoas.task.TaskModelAssembler
import io.tolgee.hateoas.task.TaskPerUserReportModel
import io.tolgee.hateoas.task.TaskPerUserReportModelAssembler
import io.tolgee.hateoas.userAccount.UserAccountInProjectModel
import io.tolgee.hateoas.userAccount.UserAccountInProjectModelAssembler
import io.tolgee.model.enums.Scope
import io.tolgee.model.enums.TaskState
import io.tolgee.model.views.ExtendedUserAccountInProject
import io.tolgee.model.views.KeysScopeView
import io.tolgee.model.views.TaskWithScopeView
import io.tolgee.openApiDocs.OpenApiOrderExtension
import io.tolgee.security.ProjectHolder
import io.tolgee.security.authentication.AllowApiAccess
import io.tolgee.security.authorization.RequiresProjectPermissions
import io.tolgee.security.authorization.UseDefaultPermissions
import io.tolgee.service.TaskService
import io.tolgee.service.security.SecurityService
import io.tolgee.service.security.UserAccountService
import jakarta.validation.Valid
import org.springdoc.core.annotations.ParameterObject
import org.springframework.core.io.ByteArrayResource
import org.springframework.data.domain.Pageable
import org.springframework.data.web.PagedResourcesAssembler
import org.springframework.hateoas.PagedModel
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@CrossOrigin(origins = ["*"])
@RequestMapping(
  value = [
    "/v2/projects/{projectId}/tasks",
    "/v2/projects/tasks",
  ],
)
@Tag(name = "Tasks", description = "Manipulates tasks")
@OpenApiOrderExtension(7)
class TaskController(
  private val taskService: TaskService,
  private val taskModelAssembler: TaskModelAssembler,
  private val pagedTaskResourcesAssembler: PagedResourcesAssembler<TaskWithScopeView>,
  private val projectHolder: ProjectHolder,
  private val userAccountService: UserAccountService,
  private val userAccountInProjectModelAssembler: UserAccountInProjectModelAssembler,
  private val pagedUserResourcesAssembler: PagedResourcesAssembler<ExtendedUserAccountInProject>,
  private val taskPerUserReportModelAssembler: TaskPerUserReportModelAssembler,
  private val securityService: SecurityService
) {
  @GetMapping("")
  @Operation(summary = "Get tasks")
  @RequiresProjectPermissions([Scope.TASKS_VIEW])
  @AllowApiAccess
  fun getTasks(
    @ParameterObject
    filters: TaskFilters,
    @ParameterObject
    pageable: Pageable,
    @RequestParam("search", required = false)
    search: String?,
  ): PagedModel<TaskModel> {
    val tasks = taskService.getAllPaged(projectHolder.projectEntity, pageable, search, filters)
    return pagedTaskResourcesAssembler.toModel(tasks, taskModelAssembler)
  }

  @PostMapping("")
  @Operation(summary = "Create task")
  @RequiresProjectPermissions([Scope.TASKS_EDIT])
  @AllowApiAccess
  fun createTask(
    @RequestBody @Valid
    dto: CreateTaskRequest,
    @ParameterObject
    filters: TranslationScopeFilters,
  ): TaskModel {
    val task = taskService.createTask(projectHolder.projectEntity, dto, filters)
    return taskModelAssembler.toModel(task)
  }

  @GetMapping("/{taskId}")
  @Operation(summary = "Get task")
  @RequiresProjectPermissions([Scope.TASKS_VIEW])
  @AllowApiAccess
  fun getTask(
    @PathVariable
    taskId: Long,
  ): TaskModel {
    val task = taskService.getTask(projectHolder.projectEntity, taskId)
    return taskModelAssembler.toModel(task)
  }

  @PutMapping("/{taskId}")
  @Operation(summary = "Update task")
  @RequiresProjectPermissions([Scope.TASKS_EDIT])
  @AllowApiAccess
  fun updateTask(
    @PathVariable
    taskId: Long,
    @RequestBody @Valid
    dto: UpdateTaskRequest,
  ): TaskModel {
    val task = taskService.updateTask(projectHolder.projectEntity, taskId, dto)
    return taskModelAssembler.toModel(task)
  }

  @DeleteMapping("/{taskId}")
  @Operation(summary = "Delete task")
  @RequiresProjectPermissions([Scope.TASKS_EDIT])
  @AllowApiAccess
  fun deleteTask(
    @PathVariable
    taskId: Long,
  ) {
    taskService.deleteTask(projectHolder.projectEntity, taskId)
  }

  @GetMapping("/{taskId}/per-user-report")
  @Operation(summary = "Report who did what")
  @RequiresProjectPermissions([Scope.TASKS_VIEW])
  @AllowApiAccess
  fun getPerUserReport(
    @PathVariable
    taskId: Long,
  ): List<TaskPerUserReportModel> {
    val result = taskService.getReport(projectHolder.projectEntity, taskId)
    return result.map { taskPerUserReportModelAssembler.toModel(it) }
  }

  @GetMapping("/{taskId}/csv-report")
  @Operation(summary = "Report who did what")
  @RequiresProjectPermissions([Scope.TASKS_VIEW])
  @AllowApiAccess
  fun getCsvReport(
    @PathVariable
    taskId: Long,
  ): ResponseEntity<ByteArrayResource> {
    val byteArray = taskService.getExcelFile(projectHolder.projectEntity, taskId)
    val resource = ByteArrayResource(byteArray)

    val headers = HttpHeaders()
    headers.contentType = MediaType.APPLICATION_OCTET_STREAM
    headers.setContentDispositionFormData("attachment", "report.xlsx")
    headers.contentLength = byteArray.size.toLong()

    return ResponseEntity(resource, headers, HttpStatus.OK)
  }

  @GetMapping("/{taskId}/keys")
  @Operation(summary = "Get task keys")
  @RequiresProjectPermissions([Scope.TASKS_VIEW])
  @AllowApiAccess
  fun getTaskKeys(
    @PathVariable
    taskId: Long,
  ): TaskKeysResponse {
    return TaskKeysResponse(
      keys = taskService.getTaskKeys(projectHolder.projectEntity, taskId),
    )
  }

  @PutMapping("/{taskId}/keys")
  @Operation(summary = "Add or remove task keys")
  @RequiresProjectPermissions([Scope.TASKS_EDIT])
  @AllowApiAccess
  fun updateTaskKeys(
    @PathVariable
    taskId: Long,
    @RequestBody @Valid
    dto: UpdateTaskKeysRequest,
  ) {
    taskService.updateTaskKeys(projectHolder.projectEntity, taskId, dto)
  }

  @PostMapping("/{taskId}/finish")
  @Operation(summary = "Finish task")
  // permissions checked inside
  @UseDefaultPermissions
  @AllowApiAccess
  fun finishTask(
    @PathVariable
    taskId: Long,
  ): TaskModel {
    // user can only finish tasks assigned to him
    securityService.hasTaskEditScopeOrIsAssigned(projectHolder.projectEntity.id, taskId)
    val task = taskService.updateTask(projectHolder.projectEntity, taskId, UpdateTaskRequest(
      state = TaskState.DONE
    ))
    return taskModelAssembler.toModel(task)
  }

  @PutMapping("/{taskId}/keys/{keyId}")
  @Operation(summary = "Update task key")
  // permissions checked inside
  @UseDefaultPermissions
  @AllowApiAccess
  fun updateTaskKey(
    @PathVariable
    taskId: Long,
    @PathVariable
    keyId: Long,
    @RequestBody @Valid
    dto: UpdateTaskKeyRequest,
  ): UpdateTaskKeyResponse {
    // user can only update tasks assigned to him
    securityService.hasTaskEditScopeOrIsAssigned(projectHolder.projectEntity.id, taskId)
    return taskService.updateTaskKey(projectHolder.projectEntity, taskId, keyId, dto)
  }

  @PostMapping("/create-multiple")
  @Operation(summary = "Create multiple tasks")
  @RequiresProjectPermissions([Scope.TASKS_EDIT])
  @AllowApiAccess
  fun createTasks(
    @RequestBody @Valid
    dto: CreateMultipleTasksRequest,
    @ParameterObject
    filters: TranslationScopeFilters,
  ) {
    taskService.createMultipleTasks(projectHolder.projectEntity, dto.tasks, filters)
  }

  @PostMapping("/calculate-scope")
  @Operation(summary = "Calculate scope")
  @RequiresProjectPermissions([Scope.TASKS_VIEW])
  @AllowApiAccess
  fun calculateScope(
    @RequestBody @Valid
    dto: CalculateScopeRequest,
    @ParameterObject
    filters: TranslationScopeFilters,
  ): KeysScopeView {
    return taskService.calculateScope(projectHolder.projectEntity, dto, filters)
  }

  @GetMapping("/possible-assignees")
  @RequiresProjectPermissions([Scope.TASKS_EDIT])
  @AllowApiAccess
  fun getPossibleAssignees(
    @ParameterObject
    filters: UserAccountFilters,
    @ParameterObject
    pageable: Pageable,
    @RequestParam("search", required = false)
    search: String?,
  ): PagedModel<UserAccountInProjectModel> {
    val users =
      userAccountService.getAllInProjectWithPermittedLanguages(
        projectHolder.projectEntity.id,
        pageable,
        search,
        null,
        filters,
      )
    return pagedUserResourcesAssembler.toModel(users, userAccountInProjectModelAssembler)
  }
}
