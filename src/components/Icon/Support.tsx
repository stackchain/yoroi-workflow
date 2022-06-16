import React from 'react'
import Svg, {Path} from 'react-native-svg'

type Props = {
  size?: number
  color?: string
}

export const Support = ({size = 36, color = 'black'}: Props) => (
  <Svg width={size} height={size} viewBox="-2 -2 28 28">
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M6.34315 6.34315C7.84344 4.84285 9.87827 4 12 4C14.1217 4 16.1566 4.84285 17.6569 6.34315C19.1571 7.84344 20 9.87827 20 12V13H18C17.2043 13 16.4413 13.3161 15.8787 13.8787C15.3161 14.4413 15 15.2043 15 16V19C15 19.7957 15.3161 20.5587 15.8787 21.1213C16.4413 21.6839 17.2043 22 18 22H19C19.7957 22 20.5587 21.6839 21.1213 21.1213C21.6839 20.5587 22 19.7957 22 19V12C22 9.34784 20.9464 6.8043 19.0711 4.92893C17.1957 3.05357 14.6522 2 12 2C9.34784 2 6.8043 3.05357 4.92893 4.92893C3.05357 6.8043 2 9.34784 2 12V19C2 19.7957 2.31607 20.5587 2.87868 21.1213C3.44129 21.6839 4.20435 22 5 22H6C6.79565 22 7.55871 21.6839 8.12132 21.1213C8.68393 20.5587 9 19.7957 9 19V16C9 15.2044 8.68393 14.4413 8.12132 13.8787C7.55871 13.3161 6.79565 13 6 13H4V12C4 9.87827 4.84285 7.84344 6.34315 6.34315ZM4 15V19C4 19.2652 4.10536 19.5196 4.29289 19.7071C4.48043 19.8946 4.73478 20 5 20H6C6.26522 20 6.51957 19.8946 6.70711 19.7071C6.89464 19.5196 7 19.2652 7 19V16C7 15.7348 6.89464 15.4804 6.70711 15.2929C6.51957 15.1054 6.26522 15 6 15H4ZM20 15H18C17.7348 15 17.4804 15.1054 17.2929 15.2929C17.1054 15.4804 17 15.7348 17 16V19C17 19.2652 17.1054 19.5196 17.2929 19.7071C17.4804 19.8946 17.7348 20 18 20H19C19.2652 20 19.5196 19.8946 19.7071 19.7071C19.8946 19.5196 20 19.2652 20 19V15Z"
      fill={color}
    />
  </Svg>
)
