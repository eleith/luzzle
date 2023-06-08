import PageFull from '@app/common/components/layout/PageFull'
import { Box, Text } from '@luzzle/ui/components'

function pageNotFound() {
  return (
    <Box style={{ display: 'flex', justifyContent: 'center' }}>
      <Box style={{ width: '80%', margin: 'auto' }}>
        <Text as={'h1'} size={'title'}>
          this page intentionally left blank
        </Text>
      </Box>
    </Box>
  )
}

function Error() {
  return <PageFull meta={{ title: 'not found' }}>{pageNotFound()}</PageFull>
}

export default Error
