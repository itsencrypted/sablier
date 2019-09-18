const { devConstants } = require("@sablier/dev-utils");
const BigNumber = require("bignumber.js");
const dayjs = require("dayjs");
const traveler = require("ganache-time-traveler");
const truffleAssert = require("truffle-assertions");

const {
  STANDARD_RECIPIENT_SHARE_PERCENTAGE,
  STANDARD_SALARY_CTOKEN,
  STANDARD_SENDER_SHARE_PERCENTAGE,
  STANDARD_TIME_OFFSET,
  STANDARD_TIME_DELTA,
} = devConstants;

function shouldBehaveLikeUnderlyingBalanceWithoutInterestOf(alice, bob, carol) {
  const sender = alice;
  const recipient = bob;
  const deposit = STANDARD_SALARY_CTOKEN.toString(10);
  const senderSharePercentage = STANDARD_SENDER_SHARE_PERCENTAGE;
  const recipientSharePercentage = STANDARD_RECIPIENT_SHARE_PERCENTAGE;
  const opts = { from: sender };
  const now = new BigNumber(dayjs().unix());
  const startTime = now.plus(STANDARD_TIME_OFFSET);
  const stopTime = startTime.plus(STANDARD_TIME_DELTA);

  beforeEach(async function() {
    await this.sablier.whitelistCToken(this.cToken.address, opts);
    await this.cToken.approve(this.sablier.address, deposit, opts);
  });

  describe("when the compounding stream exists", function() {
    let streamId;

    beforeEach(async function() {
      await this.cToken.approve(this.sablier.address, deposit, opts);
      const result = await this.sablier.createCompoundingStream(
        recipient,
        deposit,
        this.cToken.address,
        startTime,
        stopTime,
        senderSharePercentage,
        recipientSharePercentage,
        opts,
      );
      streamId = Number(result.logs[0].args.streamId);
    });

    describe("when the stream did start but not end", function() {
      beforeEach(async function() {
        await traveler.advanceBlockAndSetTime(
          now
            .plus(STANDARD_TIME_OFFSET)
            .plus(5)
            .toNumber(),
        );
      });

      it("returns 0 for anyone else", async function() {
        const balance = await this.sablier.underlyingBalanceWithoutInterestOf(streamId, carol, opts);
        balance.should.be.bignumber.equal(new BigNumber(0));
      });

      afterEach(async function() {
        await traveler.advanceBlockAndSetTime(now.toNumber());
      });
    });
  });

  describe("when the compounding stream does not exist", function() {
    it("reverts", async function() {
      const streamId = new BigNumber(419863);
      await truffleAssert.reverts(
        this.sablier.underlyingBalanceWithoutInterestOf(streamId, sender, opts),
        "stream does not exist",
      );
    });
  });
}

module.exports = shouldBehaveLikeUnderlyingBalanceWithoutInterestOf;
