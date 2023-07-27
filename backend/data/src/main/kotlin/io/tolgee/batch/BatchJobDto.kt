package io.tolgee.batch

import io.tolgee.model.batch.BatchJob
import io.tolgee.model.batch.BatchJobStatus
import io.tolgee.model.batch.IBatchJob

class BatchJobDto(
  override var id: Long,
  val projectId: Long,
  val authorId: Long?,
  val target: List<Long>,
  val totalItems: Int,
  val totalChunks: Int,
  val chunkSize: Int,
  override var status: BatchJobStatus,
  val type: BatchJobType,
  val params: Any?,
) : IBatchJob {
  val chunkedTarget get() = BatchJob.chunkTarget(chunkSize, target)

  companion object {
    fun fromEntity(entity: BatchJob): BatchJobDto {
      return BatchJobDto(
        id = entity.id,
        projectId = entity.project.id,
        authorId = entity.author?.id,
        target = entity.target,
        totalItems = entity.totalItems,
        totalChunks = entity.totalChunks,
        chunkSize = entity.chunkSize,
        status = entity.status,
        type = entity.type,
        params = entity.params,
      )
    }
  }
}
