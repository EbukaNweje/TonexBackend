const router = require("express").Router()
const { confirmDeposit, confirmWithdraw, deleteoneDeposit } = require("../controllers/Admin")


router.post('/confirm-deposit/:depositId', confirmDeposit)
router.delete('/deleteoneDeposit/:depositId', deleteoneDeposit)
router.post('/confirm-withdrawal/:withdrawId', confirmWithdraw)

module.exports = router
