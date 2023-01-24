package io.tolgee.api.v2.controllers.v2KeyController

import io.tolgee.controllers.ProjectAuthControllerTest
import io.tolgee.development.testDataBuilder.data.ResolvableImportTestData
import io.tolgee.fixtures.andIsOk
import io.tolgee.testing.annotations.ProjectJWTAuthTestMethod
import io.tolgee.testing.assert
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest

@SpringBootTest
@AutoConfigureMockMvc
class KeyControllerResolvableImportTest : ProjectAuthControllerTest("/v2/projects/") {

  val testData = ResolvableImportTestData()

  @BeforeEach
  fun setup() {
    testDataService.saveTestData(testData.root)
    projectSupplier = { testData.projectBuilder.self }
    userAccount = testData.user
  }

  @Test
  @ProjectJWTAuthTestMethod
  fun `it imports`() {
    performProjectAuthPost(
      "keys/import-resolvable",
      mapOf(
        "keys" to listOf(
          mapOf(
            "name" to "key-1",
            "namespace" to "namespace-1",
            "translations" to mapOf(
              "de" to mapOf(
                "text" to "changed",
                "resolution" to "OVERRIDE"
              ),
              "en" to mapOf(
                "text" to "new",
                "resolution" to "NEW"
              )
            )
          ),
          mapOf(
            "name" to "key-2",
            "namespace" to "namespace-1",
            "translations" to mapOf(
              "en" to mapOf(
                "text" to "new",
                "resolution" to "KEEP"
              )
            )
          ),
        )
      )
    ).andIsOk

    executeInNewTransaction {
      assertTranslationText("namespace-1", "key-1", "de", "changed")
      assertTranslationText("namespace-1", "key-1", "en", "new")
      assertTranslationText("namespace-1", "key-2", "en", "existing translation")
    }
  }

  fun assertTranslationText(namespace: String?, keyName: String, languageTag: String, expectedText: String) {
    projectService.get(testData.projectBuilder.self.id)
      .keys
      .find { it.name == keyName && it.namespace?.name == namespace }!!
      .translations
      .find { it.language.tag == languageTag }!!
      .text
      .assert.isEqualTo(
        expectedText
      )
  }
}