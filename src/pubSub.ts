import type { RedisClientType } from 'redis'

import { EventEmitter } from 'events'

class PubSub<T extends Record<string, unknown>> {
	private channel
	private eventEmitter

	private redis
	private redisSub

	constructor(redis: RedisClientType<any, any, any>, channel: string) {
		this.channel = channel
		this.eventEmitter = new EventEmitter()

		this.redis = redis
		this.redisSub = this.redis.duplicate()
	}

	// initialize the redis pub/sub listener
	public async initHandler() {
		await this.redisSub.connect()

		// subscribe to the pub-sub
		void this.redisSub.pSubscribe(`${this.channel}:*`, (message: string, ch: string) => {
			// check if there is a user subscribed to the channel
			if (this.eventEmitter.listenerCount(ch) > 0) {
				// emit the message to the listener of the channel
				try {
					const data = JSON.parse(message) as Record<string, unknown>
					this.eventEmitter.emit(ch, data)
				} catch {}
			}
		})
	}

	// return an interator for a specific channel
	// eslint-disable-next-line @typescript-eslint/ban-types
	public async *iterator(channelId: '*' | ({} & string)) {
		const channel = `${this.channel}:${channelId}`

		const dataArray: T[] = []
		let resolve: ((value: T | PromiseLike<T>) => void) | undefined = undefined

		const listener = (data: T) => {
			if (resolve === undefined) dataArray.push(data)
			else {
				resolve(data)
				resolve = undefined
			}
		}

		try {
			this.eventEmitter.addListener(channel, listener)

			while (true) {
				if (dataArray.length > 0) {
					yield dataArray.shift()!
					continue
				}

				yield await new Promise<T>(res => void (resolve = res))
			}
		} finally {
			this.eventEmitter.removeListener(channel, listener)
		}
	}

	// eslint-disable-next-line @typescript-eslint/ban-types
	public async publish(channelId: '*' | ({} & string), data: T) {
		const channel = `${this.channel}:${channelId}`

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
