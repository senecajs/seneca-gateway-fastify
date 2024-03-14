
function BizLogic(options) {
  const seneca = this

  seneca
    .message('biz:logic,op:sum', {left:Number, right:Number}, opsum)
    .message('biz:logic,op:mul', {left:Number, right:Number}, opmul)


  async function opsum(msg) {
    const left = msg.left
    const right = msg.right
    return {
      ok: true,
      result: left + right,
      op: msg.op,
    }
  }


  async function opmul(msg) {
    const left = msg.left
    const right = msg.right
    return {
      ok: true,
      result: left * right,
      op: msg.op,
    }
  }

}


module.exports = BizLogic
