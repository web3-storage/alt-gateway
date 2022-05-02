import anyTest from 'ava'

const test = anyTest

test.before((t) => {
  t.context = { mf }
})

test('should work', async (t) => {
  t.truthy(true)
})
