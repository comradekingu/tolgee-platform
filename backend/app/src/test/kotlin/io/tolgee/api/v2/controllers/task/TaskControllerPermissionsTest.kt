package io.tolgee.api.v2.controllers.task

import io.tolgee.ProjectAuthControllerTest
import io.tolgee.development.testDataBuilder.data.TaskTestData
import io.tolgee.dtos.request.task.UpdateTaskKeyRequest
import io.tolgee.dtos.request.task.UpdateTaskKeysRequest
import io.tolgee.dtos.request.task.UpdateTaskRequest
import io.tolgee.fixtures.andAssertThatJson
import io.tolgee.fixtures.andIsForbidden
import io.tolgee.fixtures.andIsOk
import io.tolgee.testing.annotations.ProjectJWTAuthTestMethod
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test

class TaskControllerPermissionsTest : ProjectAuthControllerTest("/v2/projects/") {
  lateinit var testData: TaskTestData

  @BeforeEach
  fun setup() {
    testData = TaskTestData()
    projectSupplier = { testData.projectBuilder.self }
    testDataService.saveTestData(testData.root)
    userAccount = testData.user
  }

  @Test
  @ProjectJWTAuthTestMethod
  fun `sees only translate tasks in user tasks`() {
    // is assigned to translate task
    userAccount = testData.projectUser.self

    performAuthGet(
      "/v2/user-tasks",
    ).andIsOk.andAssertThatJson {
      node("page.totalElements").isEqualTo(1)
      node("_embedded.tasks[0].name").isEqualTo("Translate task")
    }
  }

  @Test
  @ProjectJWTAuthTestMethod
  fun `can access translate task's data`() {
    userAccount = testData.projectUser.self

    performProjectAuthGet("tasks/${testData.translateTask.self.id}").andIsOk
    performProjectAuthGet("tasks/${testData.translateTask.self.id}/per-user-report").andIsOk
    performProjectAuthGet("tasks/${testData.translateTask.self.id}/csv-report").andIsOk
    performProjectAuthGet("tasks/${testData.translateTask.self.id}/keys").andIsOk
  }

  @Test
  @ProjectJWTAuthTestMethod
  fun `can do necessary translate task's operations`() {
    userAccount = testData.projectUser.self

    performProjectAuthPut(
      "tasks/${testData.translateTask.self.id}/keys/${testData.keysInTask.first().self.id}",
      UpdateTaskKeyRequest(done = true),
    ).andIsOk
    performProjectAuthPost("tasks/${testData.translateTask.self.id}/finish").andIsOk
  }

  @Test
  @ProjectJWTAuthTestMethod
  fun `can't do advanced translate task's operations`() {
    userAccount = testData.projectUser.self

    performProjectAuthPut(
      "tasks/${testData.translateTask.self.id}/keys",
      UpdateTaskKeysRequest(addKeys = mutableSetOf(testData.keysOutOfTask.first().self.id)),
    ).andIsForbidden
    performProjectAuthPut(
      "tasks/${testData.translateTask.self.id}",
      UpdateTaskRequest(name = "Test"),
    ).andIsForbidden
  }

  @Test
  @ProjectJWTAuthTestMethod
  fun `can't access review task's data`() {
    userAccount = testData.projectUser.self

    performProjectAuthGet("tasks/${testData.reviewTask.self.id}").andIsForbidden
    performProjectAuthGet("tasks/${testData.reviewTask.self.id}/per-user-report").andIsForbidden
    performProjectAuthGet("tasks/${testData.reviewTask.self.id}/csv-report").andIsForbidden
    performProjectAuthGet("tasks/${testData.reviewTask.self.id}/keys").andIsForbidden
    performProjectAuthPut(
      "tasks/${testData.reviewTask.self.id}/keys/${testData.keysInTask.first().self.id}",
      UpdateTaskKeyRequest(done = true),
    ).andIsForbidden
    performProjectAuthPost("tasks/${testData.reviewTask.self.id}/finish").andIsForbidden
    performProjectAuthPut(
      "tasks/${testData.reviewTask.self.id}/keys",
      UpdateTaskKeysRequest(addKeys = mutableSetOf(testData.keysOutOfTask.first().self.id)),
    ).andIsForbidden
    performProjectAuthPut(
      "tasks/${testData.reviewTask.self.id}",
      UpdateTaskRequest(name = "Test"),
    ).andIsForbidden
  }
}
