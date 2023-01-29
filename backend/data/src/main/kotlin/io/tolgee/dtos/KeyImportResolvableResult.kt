package io.tolgee.dtos

import io.tolgee.model.Screenshot
import io.tolgee.model.key.Key
import java.awt.Dimension

data class KeyImportResolvableResult(
  val keys: List<Key>,
  val screenshots: Map<Long, Screenshot>,
)