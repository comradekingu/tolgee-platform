package io.tolgee.service

import io.tolgee.component.task.TaskReportHelper
import io.tolgee.constants.Message
import io.tolgee.dtos.request.task.*
import io.tolgee.exceptions.BadRequestException
import io.tolgee.exceptions.NotFoundException
import io.tolgee.model.Language
import io.tolgee.model.Project
import io.tolgee.model.UserAccount
import io.tolgee.model.enums.TaskState
import io.tolgee.model.enums.TaskType
import io.tolgee.model.key.Key
import io.tolgee.model.task.Task
import io.tolgee.model.task.TaskId
import io.tolgee.model.task.TaskTranslation
import io.tolgee.model.task.TaskTranslationId
import io.tolgee.model.translation.Translation
import io.tolgee.model.views.*
import io.tolgee.repository.TaskRepository
import io.tolgee.repository.TaskTranslationRepository
import io.tolgee.repository.TranslationRepository
import io.tolgee.security.authentication.AuthenticationFacade
import io.tolgee.service.language.LanguageService
import io.tolgee.service.security.SecurityService
import io.tolgee.service.translation.TranslationService
import jakarta.persistence.EntityManager
import jakarta.transaction.Transactional
import org.apache.commons.io.output.ByteArrayOutputStream
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.context.annotation.Lazy
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageImpl
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Component
import java.util.*

@Component
class TaskService(
  private val taskRepository: TaskRepository,
  private val entityManager: EntityManager,
  private val languageService: LanguageService,
  private val securityService: SecurityService,
  private val taskTranslationRepository: TaskTranslationRepository,
  private val translationService: TranslationService,
  private val authenticationFacade: AuthenticationFacade,
  private val translationRepository: TranslationRepository,
  @Lazy
  @Autowired
  private val taskService: TaskService,
) {
  fun getAllPaged(
    project: Project,
    pageable: Pageable,
    search: String?,
    filters: TaskFilters,
  ): Page<TaskWithScopeView> {
    val pagedTasks = taskRepository.getAllByProjectId(project.id, pageable, search, filters)
    val withPrefetched = getPrefetchedTasks(pagedTasks.content)
    return PageImpl(getTasksWithScope(withPrefetched), pageable, pagedTasks.totalElements)
  }

  fun getUserTasksPaged(
    userId: Long,
    pageable: Pageable,
    search: String?,
    filters: TaskFilters,
  ): Page<TaskWithScopeView> {
    val pagedTasks = taskRepository.getAllByAssignee(userId, pageable, search, filters)
    val withPrefetched = getPrefetchedTasks(pagedTasks.content)
    return PageImpl(getTasksWithScope(withPrefetched), pageable, pagedTasks.totalElements)
  }

  fun getPrefetchedTasks(tasks: Collection<Task>): List<Task> {
    val ids = tasks.map { it.id }.mapIndexed { i, v -> Pair(v, i) }.toMap()
    val data = taskRepository.getByIdsWithAllPrefetched(tasks)
    // return tasks in the same order
    return data.sortedBy { ids[it.id] }
  }

  @Transactional
  fun createMultipleTasks(
    project: Project,
    dtos: Collection<CreateTaskRequest>,
    filters: TranslationScopeFilters,
  ) {
    dtos.forEach {
      createTask(project, it, filters)
    }
  }

  @Transactional
  fun createTask(
    project: Project,
    dto: CreateTaskRequest,
    filters: TranslationScopeFilters,
  ): TaskWithScopeView {
    var lastErr = DataIntegrityViolationException("Error")
    repeat(100) {
      // necessary for proper transaction creation
      try {
        val task = taskService.createTaskInTransaction(project, dto, filters)
        entityManager.flush()
        return getTasksWithScope(listOf(task)).first()
      } catch (e: DataIntegrityViolationException) {
        lastErr = e
      }
    }
    throw lastErr
  }

  @Transactional()
  fun createTaskInTransaction(
    project: Project,
    dto: CreateTaskRequest,
    filters: TranslationScopeFilters,
  ): Task {
    // Find the maximum ID for the given project
    val lastTask = taskRepository.findByProjectOrderByIdDesc(project).firstOrNull()
    val newId = (lastTask?.id ?: 0L) + 1

    val language = checkLanguage(dto.languageId!!, project)
    val assignees = checkAssignees(dto.assignees ?: mutableSetOf(), project)
    val keys =
      getOnlyProjectKeys(
        project,
        dto.languageId!!,
        dto.type,
        dto.keys ?: mutableSetOf(),
        filters,
      )

    val translations = getOrCreateTranslations(language.id, keys)

    val task = Task()

    task.id = newId
    task.project = project
    task.name = dto.name
    task.type = dto.type
    task.description = dto.description
    task.dueDate = dto.dueDate?.let { Date(it) }
    task.language = language
    task.assignees = assignees
    task.author = entityManager.getReference(UserAccount::class.java, authenticationFacade.authenticatedUser.id)
    task.createdAt = Date()
    task.state = dto.state ?: TaskState.IN_PROGRESS
    taskRepository.saveAndFlush(task)

    val taskTranslations = translations.map { TaskTranslation(task, it) }.toMutableSet()
    task.translations = taskTranslations
    taskTranslationRepository.saveAll(taskTranslations)

    return task
  }

  @Transactional
  fun updateTask(
    projectEntity: Project,
    taskId: Long,
    dto: UpdateTaskRequest,
  ): TaskWithScopeView {
    val task =
      taskRepository.findById(TaskId(projectEntity, taskId)).or {
        throw NotFoundException(Message.TASK_NOT_FOUND)
      }.get()

    dto.name?.let {
      task.name = it
    }

    dto.description?.let {
      task.description = it
    }

    dto.dueDate?.let {
      if (it < 0L) {
        task.dueDate = null
      } else {
        task.dueDate = Date(it)
      }
    }

    dto.assignees?.let {
      task.assignees = checkAssignees(dto.assignees!!, projectEntity)
    }

    dto.state?.let {
      task.state = it
      if (dto.state !== TaskState.IN_PROGRESS) {
        task.closedAt = Date()
      }
    }

    taskRepository.saveAndFlush(task)

    return getTasksWithScope(listOf(task)).first()
  }

  @Transactional
  fun deleteTask(
    projectEntity: Project,
    taskId: Long,
  ) {
    val taskComposedId = TaskId(projectEntity, taskId)
    taskTranslationRepository.deleteByTask(entityManager.getReference(Task::class.java, taskComposedId))
    taskRepository.deleteById(taskComposedId)
  }

  @Transactional
  fun getTask(
    projectEntity: Project,
    taskId: Long,
  ): TaskWithScopeView {
    val taskComposedId = TaskId(projectEntity, taskId)
    val task = taskRepository.getReferenceById(taskComposedId)
    return getTasksWithScope(listOf(task)).first()
  }

  @Transactional
  fun updateTaskKeys(
    projectEntity: Project,
    taskId: Long,
    dto: UpdateTaskKeysRequest,
  ) {
    val task =
      taskRepository.findById(TaskId(projectEntity, taskId)).or {
        throw NotFoundException(Message.TASK_NOT_FOUND)
      }.get()

    dto.removeKeys?.let { toRemove ->
      val translationsToRemove =
        translationService
          .getLanguageTrasnlationsByIds(task.language.id, toRemove)
          .map { it.id }
      val taskKeysToRemove =
        task.translations.filter {
          translationsToRemove.contains(
            it.translation.id,
          )
        }.toMutableSet()
      task.translations = task.translations.subtract(taskKeysToRemove).toMutableSet()
      taskTranslationRepository.deleteAll(taskKeysToRemove)
    }

    dto.addKeys?.let { toAdd ->
      val translationsToAdd = getOrCreateTranslations(task.language.id, toAdd)
      val translationIdsToAdd = translationsToAdd.map { it.id }.toMutableSet()
      val existingTranslations = task.translations.map { it.translation.id }.toMutableSet()
      val nonExistingTranslationIds = translationIdsToAdd.subtract(existingTranslations).toMutableSet()
      val taskTranslationsToAdd =
        translationsToAdd
          .filter { nonExistingTranslationIds.contains(it.id) }
          .map { TaskTranslation(task, it) }
      task.translations = task.translations.union(taskTranslationsToAdd).toMutableSet()
      taskTranslationRepository.saveAll(taskTranslationsToAdd)
    }
  }

  @Transactional
  fun updateTaskKey(
    projectEntity: Project,
    taskId: Long,
    keyId: Long,
    dto: UpdateTaskKeyRequest,
  ): UpdateTaskKeyResponse {
    val task =
      taskRepository.findById(TaskId(projectEntity, taskId)).or {
        throw NotFoundException(Message.TASK_NOT_FOUND)
      }.get()

    val translation =
      translationRepository.findOneByKeyAndLanguageId(
        entityManager.getReference(Key::class.java, keyId),
        task.language.id,
      ).or {
        throw NotFoundException(Message.TRANSLATION_NOT_FOUND)
      }.get()

    val taskTranslation =
      taskTranslationRepository.findById(TaskTranslationId(task, translation)).or {
        throw NotFoundException(Message.TASK_NOT_FOUND)
      }.get()

    val previousValue = taskTranslation.done

    if (dto.done == true) {
      taskTranslation.author =
        entityManager.getReference(
          UserAccount::class.java,
          authenticationFacade.authenticatedUser.id,
        )
    } else {
      taskTranslation.author = null
    }
    taskTranslation.done = dto.done ?: false
    taskTranslationRepository.saveAndFlush(taskTranslation)

    if (!previousValue && taskTranslation.done) {
      val taskItem = getTask(projectEntity, taskId)
      return UpdateTaskKeyResponse(
        done = taskTranslation.done,
        taskFinished = taskItem.doneItems == taskItem.totalItems,
      )
    } else {
      return UpdateTaskKeyResponse(
        done = taskTranslation.done,
        taskFinished = false,
      )
    }
  }

  @Transactional
  fun calculateScope(
    projectEntity: Project,
    dto: CalculateScopeRequest,
    filters: TranslationScopeFilters,
  ): KeysScopeView {
    val language = languageService.get(dto.language, projectEntity.id)
    val relevantKeys =
      taskRepository.getKeysWithoutTask(
        projectEntity.id,
        language.id,
        dto.type.toString(),
        dto.keys!!,
        filters,
      )
    return taskRepository.calculateScope(
      projectEntity.id,
      projectEntity.baseLanguage!!.id,
      relevantKeys,
    )
  }

  @Transactional
  fun getTaskKeys(projectEntity: Project, taskId: Long): List<Long> {
    return taskRepository.getTaskKeys(projectEntity.id, taskId)
  }

  fun getTranslationsWithTasks(
    userId: Long,
    translationIds: Collection<Long>,
  ): Map<Long, List<TranslationToTaskView>> {
    val data = taskRepository.getByTranslationId(userId, translationIds)
    val result = mutableMapOf<Long, MutableList<TranslationToTaskView>>()
    data.forEach {
      val existing = result[it.translationId] ?: mutableListOf()
      existing.add(it)
      result.set(it.translationId, existing)
    }
    return result
  }

  fun getReport(
    projectEntity: Project,
    taskId: Long,
  ): List<TaskPerUserReportView> {
    return taskRepository.perUserReport(
      projectEntity.id,
      taskId,
      projectEntity.baseLanguage!!.id,
    )
  }

  private fun getOnlyProjectKeys(
    project: Project,
    languageId: Long,
    type: TaskType,
    keys: Collection<Long>,
    filters: TranslationScopeFilters,
  ): MutableSet<Long> {
    return taskRepository.getKeysWithoutTask(
      project.id,
      languageId,
      type.toString(),
      keys,
      filters,
    ).toMutableSet()
  }

  private fun checkAssignees(
    assignees: MutableSet<Long>,
    project: Project,
  ): MutableSet<UserAccount> {
    return assignees.map {
      val permission = securityService.getProjectPermissionScopesNoApiKey(project.id, it)
      if (permission.isNullOrEmpty()) {
        throw BadRequestException(Message.USER_HAS_NO_PROJECT_ACCESS)
      }
      entityManager.getReference(UserAccount::class.java, it)
    }.toMutableSet()
  }

  private fun checkLanguage(
    language: Long,
    project: Project,
  ): Language {
    val allLanguages = languageService.findAll(project.id).associateBy { it.id }
    if (allLanguages[language] == null) {
      throw BadRequestException(Message.LANGUAGE_NOT_FROM_PROJECT)
    } else {
      return entityManager.getReference(Language::class.java, language)
    }
  }

  private fun getOrCreateTranslations(
    languageId: Long,
    keyIds: Collection<Long>,
  ): MutableList<Translation> {
    val translations = translationService.getLanguageTrasnlationsByIds(languageId, keyIds)
    val translationsHashMap = translations.associateBy({ it.key.id }, { it })

    val allTranslations = mutableListOf<Translation>()
    val newTranslations = mutableListOf<Translation>()

    keyIds.forEach {
      var translation = translationsHashMap.get(it)
      if (translation == null) {
        translation =
          Translation(
            text = null,
            key = entityManager.getReference(Key::class.java, it),
            language = entityManager.getReference(Language::class.java, languageId),
          )
        newTranslations.add(translation)
      }
      allTranslations.add(translation)
    }

    translationService.saveAll(newTranslations)
    entityManager.flush()
    return allTranslations
  }

  private fun getTasksWithScope(tasks: Collection<Task>): List<TaskWithScopeView> {
    val scopes = taskRepository.getTasksScopes(tasks)
    return tasks.map { task ->
      val scope = scopes.find { it.taskId == task.id && it.projectId == task.project.id }!!
      TaskWithScopeView(
        project = task.project,
        id = task.id,
        name = task.name,
        description = task.description,
        type = task.type,
        language = task.language,
        dueDate = task.dueDate,
        assignees = task.assignees,
        translations = task.translations,
        author = task.author!!,
        createdAt = task.createdAt,
        state = task.state,
        closedAt = task.closedAt,
        totalItems = scope.totalItems,
        doneItems = scope.doneItems,
        baseWordCount = scope.baseWordCount,
        baseCharacterCount = scope.baseCharacterCount,
      )
    }
  }

  fun getExcelFile(
    projectEntity: Project,
    taskId: Long,
  ): ByteArray {
    val task = getTask(projectEntity, taskId)
    val report = getReport(projectEntity, taskId)

    val workbook = TaskReportHelper(task, report).generateExcelReport()

    // Write the workbook to a byte array output stream
    val byteArrayOutputStream = ByteArrayOutputStream()
    workbook.use { wb ->
      wb.write(byteArrayOutputStream)
    }

    val byteArray = byteArrayOutputStream.toByteArray()
    return byteArray
  }
}
