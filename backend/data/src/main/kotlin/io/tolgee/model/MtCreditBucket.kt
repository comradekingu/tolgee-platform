package io.tolgee.model

import java.util.*
import javax.persistence.Entity
import javax.persistence.OneToOne

@Entity
class MtCreditBucket(
  @OneToOne
  var userAccount: UserAccount? = null,

  @OneToOne
  var organization: Organization? = null
) : StandardAuditModel() {

  var credits: Long = 0

  /**
   * These credits are not refilled or reset every period.
   * It's consumed when user is out of their standard credits.
   *
   * (In Tolgee Cloud users can buy these additional credits)
   */
  var additionalCredits: Long = 0

  var bucketSize: Long = 0

  var refilled: Date = Date()
}
