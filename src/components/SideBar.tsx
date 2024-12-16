import React from 'react'
import { Box } from '@dhis2/ui'

function Sidebar() {
  return (
    <Box
      width="250px"
      height="100vh"
      marginTop="10px"
      fixedPosition
      

     
     
    >
      {/* Sidebar content goes here */}
      <h2>Menu</h2>
      <ul>
        <li>The Prediction Model</li>
        <li>Model Expalanation</li>
       
        <li>.</li>
      </ul>
    </Box>
  )
}

export default Sidebar