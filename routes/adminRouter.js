const router = require("express").Router()
const { confirmDeposit, confirmWithdraw } = require("../controllers/Admin")


router.post('/confirm-deposit/:depositId', confirmDeposit)
router.post('/confirm-withdrawal/:withdrawId', confirmWithdraw)

module.exports = router
