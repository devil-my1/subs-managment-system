import Image from "next/image"

const Loader = () => {
	return (
		<div className='flex flex-col justify-center items-center h-screen w-full'>
			<Image
				src='/assets/spinner.svg'
				alt='Loading...'
				width={50}
				height={50}
			/>
		</div>
	)
}

export default Loader
