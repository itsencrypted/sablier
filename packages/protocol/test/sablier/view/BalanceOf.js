const { devConstants } = require("@sablier/dev-utils");
const BigNumber = require("bignumber.js");
const dayjs = require("dayjs");
const traveler = require("ganache-time-traveler");
const truffleAssert = require("truffle-assertions");

const { FIVE_UNITS, STANDARD_SALARY, STANDARD_SCALE, STANDARD_TIME_OFFSET, STANDARD_TIME_DELTA } = devConstants;

function shouldBehaveLikeBalanceOf(alice, bob, carol) {
  const sender = alice;
  const opts = { from: sender };
  const now = new BigNumber(dayjs().unix());

  describe("when the stream exists", function() {
    let streamId;
    const recipient = bob;
    const deposit = STANDARD_SALARY.toString(10);
    const startTime = now.plus(STANDARD_TIME_OFFSET);
    const stopTime = startTime.plus(STANDARD_TIME_DELTA);

    beforeEach(async function() {
      await this.token.approve(this.sablier.address, deposit, opts);
      const result = await this.sablier.createStream(recipient, deposit, this.token.address, startTime, stopTime, opts);
      streamId = Number(result.logs[0].args.streamId);
    });

    describe("when the stream did not start", function() {
      it("returns the whole deposit for the sender of the stream", async function() {
        const balance = await this.sablier.balanceOf(streamId, sender, opts);
        balance.should.be.bignumber.equal(deposit);
      });

      it("returns 0 for the recipient of the stream", async function() {
        const balance = await this.sablier.balanceOf(streamId, recipient, opts);
        balance.should.be.bignumber.equal(new BigNumber(0));
      });

      it("returns 0 for anyone else", async function() {
        const balance = await this.sablier.balanceOf(streamId, carol, opts);
        balance.should.be.bignumber.equal(new BigNumber(0));
      });
    });

    describe("when the stream did start but not end", function() {
      const amount = FIVE_UNITS;

      beforeEach(async function() {
        await traveler.advanceBlockAndSetTime(
          now
            .plus(STANDARD_TIME_OFFSET)
            .plus(5)
            .toNumber(),
        );
      });

      it("returns the pro rata balance for the sender of the stream", async function() {
        const balance = await this.sablier.balanceOf(streamId, sender, opts);
        const tolerateByAddition = false;
        balance.should.tolerateTheBlockTimeVariation(
          STANDARD_SALARY.minus(amount),
          STANDARD_SCALE,
          tolerateByAddition,
        );
      });

      it("returns the pro rata balance for the recipient of the stream", async function() {
        const balance = await this.sablier.balanceOf(streamId, recipient, opts);
        balance.should.tolerateTheBlockTimeVariation(amount, STANDARD_SCALE);
      });

      it("returns 0 for anyone else", async function() {
        const balance = await this.sablier.balanceOf(streamId, carol, opts);
        balance.should.be.bignumber.equal(new BigNumber(0));
      });

      afterEach(async function() {
        await traveler.advanceBlockAndSetTime(now.toNumber());
      });
    });

    describe("when the stream did end", function() {
      beforeEach(async function() {
        await traveler.advanceBlockAndSetTime(
          now
            .plus(STANDARD_TIME_OFFSET)
            .plus(STANDARD_TIME_DELTA)
            .plus(5)
            .toNumber(),
        );
      });

      it("returns 0 for the sender of the stream", async function() {
        const balance = await this.sablier.balanceOf(streamId, sender, opts);
        balance.should.be.bignumber.equal(new BigNumber(0));
      });

      it("returns the whole deposit for the recipient of the stream", async function() {
        const balance = await this.sablier.balanceOf(streamId, recipient, opts);
        balance.should.be.bignumber.equal(STANDARD_SALARY);
      });

      it("returns 0 for anyone else", async function() {
        const balance = await this.sablier.balanceOf(streamId, carol, opts);
        balance.should.be.bignumber.equal(new BigNumber(0));
      });

      afterEach(async function() {
        await traveler.advanceBlockAndSetTime(now.toNumber());
      });
    });
  });

  describe("when the stream does not exist", function() {
    it("reverts", async function() {
      const streamId = new BigNumber(419863);
      await truffleAssert.reverts(this.sablier.balanceOf(streamId, sender, opts), "stream does not exist");
    });
  });
}

module.exports = shouldBehaveLikeBalanceOf;
