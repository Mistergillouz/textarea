

function move(_array, from, to, after) {
  const array = _array.slice()
  const source = array.splice(from, 1)[0]
  array.splice(after ? to + 1 : to, 0, source)
  console.log(array)
}

const a=[10, 20, 30, 40, 50]
move(a, 0, 1, true)
move(a, 0, 1, false)

