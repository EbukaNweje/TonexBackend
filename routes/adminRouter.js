const router = require("express").Router()
const { confirmDeposit, confirmWithdraw, deleteoneDeposit, deleteoneWithdraw } = require("../controllers/Admin")


router.post('/confirm-deposit/:depositId', confirmDeposit)
router.delete('/deleteoneDeposit/:depositId', deleteoneDeposit)
router.post('/confirm-withdrawal/:withdrawId', confirmWithdraw)
router.post('/deleteoneWithdraw/:withdrawId', deleteoneWithdraw)

module.exports = router
