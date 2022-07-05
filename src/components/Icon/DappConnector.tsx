import React from 'react'
import Svg, {Path} from 'react-native-svg'

type Props = {
  size?: number
  color?: string
}

export const DappConnector = ({size = 36, color = 'black'}: Props) => (
  <Svg width={size} height={size} viewBox="-2 -2 28 28">
    <Path
      d="M10.3845 7.98476C9.98818 8.12207 9.54895 8.01675 9.25249 7.72029C8.67127 7.13907 8.89674 6.13969 9.67533 5.87444C11.1686 5.36475 12.8029 5.38071 14.2869 5.92286L15.9851 4.22471C16.9494 3.26044 18.647 3.39619 19.7782 4.52742C20.9095 5.65864 21.0452 7.35627 20.0809 8.32054L18.3828 10.0187C18.9248 11.5026 18.9407 13.1368 18.431 14.6301C18.1658 15.4087 17.1664 15.6342 16.5852 15.053C16.2887 14.7565 16.1834 14.3173 16.3207 13.921C16.8895 12.2788 16.5353 10.3892 15.2262 9.0801C13.9163 7.77022 12.0267 7.41603 10.3845 7.98476Z"
      fill={color}
    />
    <Path
      d="M13.4358 16.8061C13.8321 16.6688 14.2713 16.7741 14.5678 17.0706C15.149 17.6518 14.9235 18.6512 14.1449 18.9164C12.6517 19.4261 11.0175 19.4101 9.53344 18.868L8.015 20.3865C7.05073 21.3507 5.3531 21.215 4.22187 20.0838C3.09064 18.9525 2.9549 17.2549 3.91917 16.2906L5.43752 14.7723C4.89549 13.2883 4.87952 11.6541 5.38922 10.1607C5.65448 9.3821 6.65386 9.15664 7.23508 9.73786C7.53154 10.0343 7.63686 10.4735 7.49955 10.8699C7.00203 12.3065 7.21078 13.9323 8.14722 15.1933L9.11179 16.1579C10.3733 17.0949 11.9992 17.3036 13.4358 16.8061Z"
      fill={color}
    />
    <Path
      d="M10.2447 14.0609C11.2144 15.0307 12.7857 15.0307 13.7554 14.0609C14.7244 13.092 14.7251 11.52 13.7554 10.5502C12.7857 9.5805 11.2136 9.58128 10.2447 10.5502C9.27496 11.52 9.27496 13.0912 10.2447 14.0609Z"
      fill={color}
    />
  </Svg>
)