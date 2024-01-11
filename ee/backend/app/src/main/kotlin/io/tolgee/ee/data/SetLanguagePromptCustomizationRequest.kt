package io.tolgee.ee.data

import io.swagger.v3.oas.annotations.media.Schema
import jakarta.validation.constraints.Size

class SetLanguagePromptCustomizationRequest(
  @Schema(
    description =
      "The language description used in the  prompt that " +
        "helps AI translator to fine tune results for specific language",
    example =
      "For arabic language, we are super formal. Always use these translations: \n" +
        "Paper -> ورقة\n" +
        "Office -> مكتب\n",
  )
  @Size(max = 5000)
  var description: String? = null,
)
