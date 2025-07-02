

export function Loading() {
  return (
    <div>
      <div className="w-full h-1 overflow-hidden rounded-t-md flex mb-2">
          <div className="h-full w-full ease-in-out animate-[moveLine_1.3s_linear_infinite] flex">
            <div
              className="h-full"
              style={{
                width: '30%',
                background: '#eccb58'
              }}
            />
            <div
              className="h-full delay-300"
              style={{
                width: '40%',
                background: '#b8232e'
              }}
            />
            <div
              className="h-full delay-600"
              style={{
                width: '50%',
                background: '#0134b2'
              }}
            />
          </div>
          <style>
            {`
              @keyframes moveLine {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(250%); }
              }
            `}
          </style>
        </div>
    </div>
  )
}

export default Loading
