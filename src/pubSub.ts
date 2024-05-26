import type { EventEmitter } from 'events'
import type { RedisClientType } from 'redis'

class PubSub<T extends Record<string, unknown>> {
	private channel
	private eventEmitter: EventEmitter | undefined
	private redis
	private redisSub

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	constructor(redis: RedisClientType<any, any, any>, channel: string) {
		this.channel = channel

		this.redis = redis
		this.redisSub = this.redis.duplicate()
	}

	private channelId(channelId: string | undefined) {
		if (!this.channel.endsWith(':*')) return this.channel

		if (channelId === undefined) throw new Error('invalid channel id')
		return this.channel.slice(0, -1) + channelId
	}

	// initialize the redis pub/sub listener
	public async initHandler() {
		const { EventEmitter } = await import('events') // eslint-disable-line @typescript-eslint/naming-convention
		this.eventEmitter = new EventEmitter()

		await this.redisSub.connect()

		// subscribe to the pub-sub
		void this.redisSub.pSubscribe(this.channel, (message: string, ch: string) => {
			// check if there is a user subscribed to the channel
			if (this.eventEmitter!.listenerCount(ch) > 0) {
				// emit the message to the listener of the channel
				try {
					const data = JSON.parse(message) as Record<string, unknown>
					this.eventEmitter!.emit(ch, data)
				} catch {}
			}
		})
	}

	// return an interator for a specific channel
	public async *iterator(channelId?: string) {
		const channel = this.channelId(channelId)

		const dataArray: T[] = []
		let resolve: ((value: T | PromiseLike<T>) => void) | undefined = undefined

		const listener = (data: string) => {
			if (resolve === undefined) dataArray.push(JSON.parse(data))
			else {
				resolve(JSON.parse(data))
				resolve = undefined
			}
		}

		try {
			this.eventEmitter!.addListener(channel, listener)

			while (true) {
				if (dataArray.length > 0) {
					yield dataArray.shift()!
					continue
				}

				yield await new Promise<T>(res => void (resolve = res))
			}
		} finally {
			this.eventEmitter!.removeListener(channel, listener)
		}
	}

	public async publish(channelId: string, data: T) {
		const channel = this.channelId(channelId)

		await this.redis.publish(channel, JSON.stringify(data))
	}
}

export const pubSub = async <T extends Record<string, unknown>>(...params: ConstructorParameters<typeof PubSub<T>>) => {
	const instance = new PubSub<T>(...params)
	await instance.initHandler()

	return {
		iterator: instance.iterator.bind(instance),
		publish: instance.publish.bind(instance)
	}
}
